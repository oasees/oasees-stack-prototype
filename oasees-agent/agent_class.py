import subprocess
import sys
import threading
import time
from typing import List, Dict
import requests
from utils import query_construct
import os

device_name = os.environ.get('NODE_NAME')

proposal_states = {
	0:"Pending",
	1:"Active",
	2:"Canceled",
	3:"Defeated",
	4:"Succeeded",
	5:"Queued",
	6:"Expired",
	7:"Executed"
}


class Agent:
    def __init__(self, agent_info):
        print("Starting to interact with DAO...")
        self.w3 = agent_info['w3']
        self.device_name = agent_info['device_name']
        self.account = agent_info['account']
        self.private_key = agent_info['private_key']

        self.config = agent_info['config']
        self.dao_info = agent_info['dao_info']

        self.monitor_threads: List[threading.Thread] = []
        self.stop_event = threading.Event()

        self.governance_contract = self.dao_info['governance']
        self.token_contract = self.dao_info['token']
        self.box_contract = self.dao_info['box']
        
        self.config_lock = threading.Lock()
        self.vote_decision_lock = threading.Lock()
        self.current_vote_decision = 1

        self.proposal_cooldowns = []
        self.pending_proposals = []
        self.voted_proposals = []

        self._start_workers()
    
    def update_config(self, new_config: Dict) -> bool:
        '''Update configuration'''
        with self.config_lock:
            if new_config == self.config:
                return False  # No changes
            
            self.config = new_config
            # self._restart_workers()
            return True
        
    def update_contracts(self, new_dao_info: Dict) -> bool:
        '''Update DAO contracts and restart workers if contracts changed'''
        with self.config_lock:
            if new_dao_info == self.dao_contracts:
                return False  # No changes

            self.dao_contracts = new_dao_info
            self._restart_workers()
            return True
        
    
    def _start_workers(self):
        '''Start the monitoring threads.'''
        if not self.config:
            raise ValueError("Configuration not loaded")
        
        metrics_thread = threading.Thread(target=self.monitor_metrics, name="Metrics Monitor")
        metrics_thread.start()

        proposal_thread = threading.Thread(target=self.monitor_proposals, name="Proposal Monitor")
        proposal_thread.start()

        exec_thread = threading.Thread(target=self.monitor_value, name="Box Value Monitor")
        exec_thread.start()
        
        self.monitor_threads += [metrics_thread,proposal_thread,exec_thread]
    
    def create_proposal(self, action, msg, function_name='store'):
        '''API function that abstracts the web3 calls needed for creating a proposal.'''

        w3 = self.w3

        args = (action,)
        function_signature = self.box_contract.encode_abi(fn_name=function_name, args=args)


        # Checks if the proposal is currently redundant
        similar_exists = self.similar_active(function_signature)

        if (similar_exists):
            self.proposal_cooldowns.append(msg)
            return "Similar Pending / Active proposal already exists."


        proposal_description = f"{msg}-{time.time()}"

        transaction = self.governance_contract.functions.propose(
            [self.box_contract.address],
            [0],
            [function_signature],
            "{} {}".format(self.device_name,proposal_description)
        ).build_transaction({
            'chainId':  31337, 
            'gas': 2000000, 
            'gasPrice': w3.to_wei('30', 'gwei'), 
            'nonce': w3.eth.get_transaction_count(self.account)
        })

        signed_tx = w3.eth.account.sign_transaction(transaction, private_key= self.private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        w3.eth.wait_for_transaction_receipt(tx_hash)

        return {"device_name":self.device_name,"created_proposal":proposal_description}

    def vote(self,proposal_id,_vote,reason):
        '''API function that abstracts the web3 calls needed for voting.'''

        w3 = self.w3
        try:
            # desc = r['args']['description']
            vote_function = self.governance_contract.functions.castVoteWithReason(proposal_id, _vote,"{} {}".format(self.device_name,reason))


            transaction = vote_function.build_transaction({
                'chainId': 31337, 
                'gas': 2000000,  
                'gasPrice': w3.to_wei('30', 'gwei'),  
                'nonce': w3.eth.get_transaction_count(self.account)
            })


            signed_tx = w3.eth.account.sign_transaction(transaction, private_key=self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            w3.eth.wait_for_transaction_receipt(tx_hash)

            tx_receipt = w3.eth.get_transaction_receipt(tx_hash)

            self.voted_proposals.append(proposal_id)
        except ValueError as e:
            print(str(e))

        return {"device_name":self.device_name,"voted_for_proposal": proposal_id}
    

    def decide_vote(self,proposal_id):
        '''Function that decides what vote to cast for a given proposal.'''
        with self.vote_decision_lock:
            return self.current_vote_decision
    

    def monitor_metrics(self):

        while True:
            metric_index = self.config['metric_index']
            events = self.config['propose_on']['events']
            proposal_contents = self.config['propose_on']['proposal_contents']
            positive_vote = self.config['propose_on']['positive_vote_on']


            sequence = query_construct(events,proposal_contents,positive_vote)

            if not sequence:
                print("Error: No valid metrics found in event expressions")
                sys.exit(1)

            metrics = []
            for metric_name in sequence:
                act_metric = f"oasees_{metric_name}"
                query = f'{act_metric}{{metric_index="{metric_index}"}}'
                metrics.append((metric_name, act_metric, query))

            cluster_ip = "thanos-query.default.svc.cluster.local"
            # cluster_ip = "10.43.131.134"


            for q in sequence:
                query = q['query'].replace("replace",device_name)

                response = requests.get(f"http://{cluster_ip}:9090/api/v1/query", 
                    params={"query": query}, timeout=5).json()

                data = response.get("data",{})

                # trigger = False

                if(data):
                    results = data.get("result",{})
                    
                    for r in results:
                        trigger = int(r.get("value")[1])
                        if(trigger):
                            proposal = q['proposal']['msg']
                            action_value = q['proposal']['action_value']

                            if not proposal in self.proposal_cooldowns:
                                if(self.change_detected(action_value)):
                                    res = self.create_proposal(action_value,proposal)
                                else:
                                    res = "No proposal needed."
                                print(res)

                if q['vote_query']:

                    vq = q['vote_query'].replace("replace",device_name)

                    vote_response = requests.get(f"http://{cluster_ip}:9090/api/v1/query", 
                        params={"query": vq}, timeout=5).json()
                    
                    vote_data = vote_response.get("data", {})


                    if vote_data:
                        vote_results = vote_data.get("result", {})
                        for vr in vote_results:
                            vote_trigger = int(vr.get("value")[1])
                            if vote_trigger:
                                self.current_vote_decision = 1
                                print(f"  ✓ VOTE YES: Condition met")
                            else:
                                self.current_vote_decision = 0
                                print(f"  ✗ VOTE NO: Condition not met")

            time.sleep(5)

    def monitor_proposals(self):
        '''Responsible for monitoring the DAO's Active proposals and voting on them'''

        _filter = self.governance_contract.events.ProposalCreated.create_filter(fromBlock="0x0", argument_filters={})

        while True:
            results = _filter.get_new_entries()
            desc = "No Active Proposals"
            for r in results:
                proposal_id = int(r['args']['proposalId'])
                state = proposal_states[self.governance_contract.functions.state(proposal_id).call()]

                if(state == 'Pending'):
                    self.pending_proposals.append(proposal_id)
                
                if(state == 'Active'):
                    decided_vote = self.decide_vote(proposal_id) # TODO
                    print("DEE",decided_vote)
                    desc = self.vote(proposal_id,decided_vote,"Automated vote")   # 1-For, 2-Against

            for proposal_id in self.pending_proposals:
                state = proposal_states[self.governance_contract.functions.state(proposal_id).call()]
                if(state == 'Active'):
                    decided_vote = self.decide_vote(proposal_id) # TODO
                    print("DEE",decided_vote)
                    desc = self.vote(proposal_id,decided_vote,"Automated vote")   # 1-For, 2-Against
                    self.pending_proposals.remove(proposal_id)

            
            print(desc)
            time.sleep(5)

    def monitor_value(self):
        '''Responsible for monitoring the DAO's values and request behavioral changes.'''

        old_box_value = self.box_contract.functions.retrieve().call()
        while True:

            new_box_value = self.box_contract.functions.retrieve().call()
            
            if(old_box_value != new_box_value):
                print(f"BOX value changed from {old_box_value} to {new_box_value}!")

                endpoint = self.config['actions_map'][str(new_box_value)]['action_endpoint']
                args = self.config['actions_map'][str(new_box_value)]['args']

                result = requests.post(endpoint,json=args)

                print(result)
                old_box_value=new_box_value
                self.proposal_cooldowns.clear()
            else:
                print(f"No new metrics detected.")

            time.sleep(5)

    def change_detected(self,proposed_action):
        '''Helper function to decide if a proposal is needed or not.'''

        current_action = self.box_contract.functions.retrieve().call()

        return current_action != proposed_action
    
    def similar_active(self,function_signature):
        '''Helper function to avoid redundant proposals.'''

        states_to_check = ['Pending','Active']

        _filter = self.governance_contract.events.ProposalCreated.create_filter(fromBlock="0x0", argument_filters={})
        results = _filter.get_new_entries()

        results.reverse()

        for r in results:
            proposal_id = int(r['args']['proposalId'])
            state = proposal_states[self.governance_contract.functions.state(proposal_id).call()]
            if (state in states_to_check):
                calldatas = "0x" + r['args']['calldatas'][0].hex()
                if function_signature == calldatas:
                    return True
        return False