import subprocess
import sys
import threading
import time
from typing import List, Dict
import requests
from utils import query_construct
import os
import ast
from datetime import datetime


device_name = os.environ.get('NODE_NAME')

cluster_ip = os.environ.get('CLUSTER_IP')
telemetry_ip = os.environ.get('TELEMETRY_IP')

# cluster_ip = "thanos-query.default.svc.cluster.local"
# telemetry_ip = "telemetry-api-svc.default.svc.cluster.local"
# cluster_ip = "10.43.213.25"
# telemetry_ip = "10.43.27.222"




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
        self.dao_info['timelock_address'] = agent_info['dao_info']['governance'].functions.timelock().call() 


        self.monitor_threads: List[threading.Thread] = []
        self.stop_event = threading.Event()

        # Contract references removed - using dao_info directly
        
        self.config_lock = threading.Lock()

        self.proposal_cooldowns = []
        self.pending_proposals = []
        self.voted_proposals = []

        self.dao_info['restart'] = False
        self._start_workers()

        restart_thread = threading.Thread(target=self.restart_thread, name="Current DAO monitor")
        restart_thread.start()

        self.sequence = []
    
    def update_config(self, new_config: Dict) -> bool:
        '''Update configuration'''
        with self.config_lock:
            
            self.config = new_config
            self.proposal_cooldowns.clear()

            # Re-check latest DAO joined (contracts accessed via dao_info)
            
            # self.restart_workers()
            return True
        
    # def update_contracts(self, new_dao_info: Dict) -> bool:
    #     '''Update DAO contracts and restart workers if contracts changed'''
    #     with self.config_lock:
    #         if new_dao_info == self.dao_contracts:
    #             return False  # No changes

    #         self.dao_contracts = new_dao_info
    #         self.restart_workers()
    #         return True
        
    
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
    
    def restart_thread(self):
        '''Restart all monitoring threads by setting kill flag, joining threads, and restarting.'''
        # Set kill flag to stop all workers
        while True:

            if self.dao_info['restart']:
                
                # Join all existing threads
                for thread in self.monitor_threads:
                    if thread.is_alive():
                        thread.join()
                
                # Clear the monitor threads list
                self.monitor_threads.clear()
                
                # Reset kill flag
                self.dao_info['restart'] = False
                
                # Start workers again
                self._start_workers()

            time.sleep(10)
    
    def create_proposal(self, action, msg, function_name='store'):
        '''API function that abstracts the web3 calls needed for creating a proposal.'''

        w3 = self.w3

        args = (action,)
        function_signature = self.dao_info['box'].encode_abi(fn_name=function_name, args=args)


        # Checks if the proposal is currently redundant
        similar_exists = self.similar_active(function_signature)

        if (similar_exists):
            # self.proposal_cooldowns.append(msg)
            return "Similar Pending / Active proposal already exists."


        proposal_description = f"{msg}-{time.time()}"

        transaction = self.dao_info['governance'].functions.propose(
            [self.dao_info['box'].address],
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


    def create_fund_proposal(self,recipient,amount_eth,desc):

        w3 = self.w3


        try:
            recipient = w3.to_checksum_address(recipient)
            amount_wei = w3.to_wei(amount_eth, 'ether')
            targets = [recipient]
            values = [amount_wei]
            calldatas = ['0x']
            description = f"Transfer {amount_eth} ETH to {recipient} / {desc}"
            propose_function = self.dao_info['governance'].functions.propose(
                targets,
                values,
                calldatas,
                f"{description}-{time.time()}"
            )

            transaction = propose_function.build_transaction({
                'chainId': 31337,
                'gas': 2000000,
                'gasPrice': w3.to_wei('30', 'gwei'),
                'nonce': w3.eth.get_transaction_count(self.account)
            })

            signed_tx = w3.eth.account.sign_transaction(transaction, private_key=self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)


            proposal_created_event = self.dao_info['governance'].events.ProposalCreated().process_receipt(receipt)
            proposal_id = proposal_created_event[0]['args']['proposalId']
        except ValueError as e:
            print(str(e))


    def vote(self,proposal_id,_vote,reason):
        '''API function that abstracts the web3 calls needed for voting.'''

        if (_vote is not None):
            w3 = self.w3
            try:
                # desc = r['args']['description']
                vote_function = self.dao_info['governance'].functions.castVoteWithReason(proposal_id, _vote,"{} {}".format(self.device_name,reason))


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

            result = proposal_id
        else:
            result = "abstained"
        
        return {"device_name":self.device_name,"voted_for_proposal": result}

    def decide_vote(self,proposal_desc):
        '''Function that decides what vote to cast for a given proposal.'''
        
        for q in self.sequence:
            if q['proposal']['msg'] in proposal_desc:

                vq = q['vote_query'].replace("replace",device_name)

                try:
                    vote_response = requests.get(f"http://{cluster_ip}:9090/api/v1/query", 
                        params={"query": vq}, timeout=5)
                    vote_response.raise_for_status()
                    vote_response_data = vote_response.json()
                except requests.exceptions.RequestException as e:
                    print(f"Error querying vote metrics for {vq}: {e}")
                    continue
                except ValueError as e:
                    print(f"Error parsing JSON response for vote query: {e}")
                    continue
                
                vote_data = vote_response_data.get("data", {})
                print(vq)
                print(vote_data)

                if vote_data.get("result",{}):
                    print(f"  ✓ VOTE YES: Condition met")
                    return 1
                else:
                    print(f"  ✗ VOTE NO: Condition not met")
                    return 0
                    # vote_results = vote_data.get("result", {})
                    # for vr in vote_results:
                    #     vote_trigger = ast.literal_eval(vr.get("value")[1])
                    #     if vote_trigger:
                    #         self.current_vote_decision = 1
                    #         print(f"  ✓ VOTE YES: Condition met")
                    #     else:
                    #         self.current_vote_decision = 0
                    #         print(f"  ✗ VOTE NO: Condition not met")
        

    

    def monitor_metrics(self):

        while not self.dao_info['restart']:
            metric_index = self.config['metric_index']
            events = self.config['propose_on']['events']
            proposal_contents = self.config['propose_on']['proposal_contents']
            positive_vote = self.config['propose_on']['positive_vote_on']



            self.sequence = query_construct(events,proposal_contents,positive_vote)

            if not self.sequence:
                print("Error: No valid metrics found in event expressions")

            metrics = []
            for metric_name in self.sequence:
                act_metric = f"oasees_{metric_name}"
                query = f'{act_metric}{{metric_index="{metric_index}"}}'
                metrics.append((metric_name, act_metric, query))


            if "ipfs_data" in self.config:

                

                for q in self.sequence:
                    query = q['query'].replace("replace",device_name)

                    try:
                        response = requests.get(f"http://{cluster_ip}:9090/api/v1/query", 
                            params={"query": query}, timeout=5)
                        response.raise_for_status()
                        response_data = response.json()
                    except requests.exceptions.RequestException as e:
                        print(f"Error querying metrics for {query}: {e}")
                        continue
                    except ValueError as e:
                        print(f"Error parsing JSON response for metric query: {e}")
                        continue

                    proposal_data = response_data.get("data",{})
                    print(proposal_data)
                    print(query)
                    if(len(proposal_data['result'])):

                        if('ipfs_hash' in proposal_data['result'][0]['metric']):
                            ipfs_hash = proposal_data['result'][0]['metric']['ipfs_hash']
                            data_info = proposal_data['result'][0]['metric']['data_info']
                            m_name = proposal_data['result'][0]['metric']['__name__'].replace('oasees_','')

                            if(ipfs_hash != 'null'):
                                now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                self.add_dao_data(data_info,ipfs_hash,now)
                                response = requests.post(
                                    f"http://{telemetry_ip}:5005/remove_metric",
                                    json={"metric_index": m_name}
                                )


                        if('account' in proposal_data['result'][0]['metric']):


                            recipient = proposal_data['result'][0]['metric']['account']
                            m_name = proposal_data['result'][0]['metric']['__name__'].replace('oasees_','')
                            
                            desc = q['proposal']['msg']
                            amount_eth = q['proposal']['action_value']

                            print(recipient,amount_eth,desc)

                            self.create_fund_proposal(recipient,amount_eth,desc)
                            response = requests.post(
                                f"http://{telemetry_ip}:5005/remove_metric",
                                json={"metric_index": m_name}
                            )



            else:

                for q in self.sequence:
                    query = q['query'].replace("replace",device_name)

                    try:
                        response = requests.get(f"http://{cluster_ip}:9090/api/v1/query", 
                            params={"query": query}, timeout=5)
                        response.raise_for_status()
                        response_data = response.json()
                    except requests.exceptions.RequestException as e:
                        print(f"Error querying metrics for {query}: {e}")
                        continue
                    except ValueError as e:
                        print(f"Error parsing JSON response for metric query: {e}")
                        continue

                    proposal_data = response_data.get("data",{})

                    # trigger = False


                    if(len(self.config['propose_on']) and proposal_data.get("result",{})):
                        
                        proposal = q['proposal']['msg']
                        action_value = q['proposal']['action_value']

                        if not proposal in self.proposal_cooldowns:
                            if(self.change_detected(action_value)):
                                res = self.create_proposal(action_value,proposal)
                            else:
                                res = "No proposal needed."
                            print(res)

            time.sleep(5)
        
        print("Exiting monitor_metrics thread.")

    def monitor_proposals(self):
        '''Responsible for monitoring the DAO's Active proposals and voting on them'''

        self._filter = self.dao_info['governance'].events.ProposalCreated.create_filter(fromBlock="0x0", argument_filters={})

        while not self.dao_info['restart']:
            results = self._filter.get_new_entries()
            desc = "No Active Proposals"
            for r in results:
                proposal_id = int(r['args']['proposalId'])
                state = proposal_states[self.dao_info['governance'].functions.state(proposal_id).call()]

                if(state == 'Pending'):
                    self.pending_proposals.append(proposal_id)
                
                if(state == 'Active'):
                    decided_vote = self.decide_vote(r['args']['description']) # TODO
                    print("DEE",decided_vote)
                    desc = self.vote(proposal_id,decided_vote,"Automated vote")   # 1-For, 0-Against

            for proposal_id in self.pending_proposals:
                state = proposal_states[self.dao_info['governance'].functions.state(proposal_id).call()]
                if(state == 'Active'):
                    decided_vote = self.decide_vote(r['args']['description']) # TODO
                    print("DEE",decided_vote)
                    desc = self.vote(proposal_id,decided_vote,"Automated vote")   # 1-For, 0-Against
                    self.pending_proposals.remove(proposal_id)

            
            print(desc)
            time.sleep(5)
        
        print("Exiting monitor_proposals thread.")

    def monitor_value(self):
        '''Responsible for monitoring the DAO's values and request behavioral changes.'''

        old_box_value = self.dao_info['box'].functions.retrieve().call()
        while not self.dao_info['restart']:

            new_box_value = self.dao_info['box'].functions.retrieve().call()
            
            if(old_box_value != new_box_value):
                print(f"BOX value changed from {old_box_value} to {new_box_value}!")

                try:
                    endpoint = self.config['actions_map'][str(new_box_value)]['action_endpoint']
                    args = self.config['actions_map'][str(new_box_value)]['args']

                    leader = None

                    if 'leader' in self.config.keys():
                        leader = self.config['leader']

                    if (not leader) or leader == self.device_name:
                        result = requests.post(endpoint, json=args, timeout=10)
                        result.raise_for_status()
                        print(f"Action endpoint response: {result.status_code}")
                    else:
                        print("Another device has been assigned as leader -- No Action taken")
                except KeyError:
                    print(f"Current Action value is not defined in the configuration. No Action taken.")
                except requests.exceptions.RequestException as e:
                    print(f"Error posting to action endpoint {endpoint}: {e}")
                except Exception as e:
                    print(f"Unexpected error with action endpoint: {e}")
                old_box_value=new_box_value
                self.proposal_cooldowns.clear()
            else:
                print(f"No new metrics detected.")

            time.sleep(5)
        
        print("Exiting monitor_value thread.")


    def add_dao_data(self,data_info,hash,timestamp):


        w3 = self.w3

        add_function = self.dao_info['governance'].functions.addData(
            data_info,
            hash,
            timestamp
        )

        transaction = add_function.build_transaction({
            'chainId': 31337, 
            'gas': 2000000,  
            'gasPrice': w3.to_wei('30', 'gwei'),  
            'nonce': w3.eth.get_transaction_count(self.account)
        })

        signed_tx = w3.eth.account.sign_transaction(transaction, private_key=self.private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        w3.eth.wait_for_transaction_receipt(tx_hash)

        tx_receipt = w3.eth.get_transaction_receipt(tx_hash)
        print("Data added to DAO")



    def change_detected(self,proposed_action):
        '''Helper function to decide if a proposal is needed or not.'''

        current_action = self.dao_info['box'].functions.retrieve().call()

        return current_action != proposed_action
    
    def similar_active(self,function_signature):
        '''Helper function to avoid redundant proposals.'''

        states_to_check = ['Pending','Active']

        _filter = self.dao_info['governance'].events.ProposalCreated.create_filter(fromBlock="0x0", argument_filters={})
        results = _filter.get_new_entries()

        results.reverse()

        for r in results:
            proposal_id = int(r['args']['proposalId'])
            state = proposal_states[self.dao_info['governance'].functions.state(proposal_id).call()]
            if (state in states_to_check):
                calldatas = "0x" + r['args']['calldatas'][0].hex()
                if function_signature == calldatas:
                    return True
        return False