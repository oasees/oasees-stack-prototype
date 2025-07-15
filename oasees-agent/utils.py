import re
import subprocess
import sys
import threading
import time
from typing import List, Dict, Optional
import requests


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

        self.proposal_cooldowns = []

        self._start_workers()
    
    def update_config(self, new_config: Dict) -> bool:
        """Update configuration and restart workers if config changed"""
        with self.config_lock:
            if new_config == self.config:
                return False  # No changes
            
            self.config = new_config
            # self._restart_workers()
            return True
        
    def update_contracts(self, new_dao_info: Dict) -> bool:
        """Update DAO contracts and restart workers if contracts changed"""
        with self.config_lock:
            if new_dao_info == self.dao_contracts:
                return False  # No changes

            self.dao_contracts = new_dao_info
            self._restart_workers()
            return True
    
    # def _restart_workers(self):
    #     """Stop current workers and start new ones with fresh config"""
    #     self._stop_workers()
    #     self._start_workers()
    
    # def _stop_workers(self):
    #     """Gracefully stop all worker threads"""
    #     if not self.monitor_threads:
    #         return
            
    #     self.stop_event.set()  # Signal all threads to stop
        
    #     for thread in self.monitor_threads:
    #         thread.join()  # Wait reasonable time
            
    #     print(len(self.monitor_threads))
    #     self.monitor_threads.clear()
    #     self.stop_event.clear()  # Reset for next batch
    
    def _start_workers(self):
        """Start new worker threads based on current config"""
        if not self.config:
            raise ValueError("Configuration not loaded")
        
        metrics_thread = threading.Thread(target=self.monitor_metrics, name="Metrics Monitor")
        metrics_thread.start()

        proposal_thread = threading.Thread(target=self.monitor_proposals, name="Proposal Monitor")
        proposal_thread.start()

        exec_thread = threading.Thread(target=self.monitor_value, name="Box Value Monitor")
        exec_thread.start()
        
        self.monitor_threads += [metrics_thread,proposal_thread,exec_thread]
    
    def create_proposal(self, action,msg, function_name='store'):
        w3 = self.w3

        args = (action,)
        function_signature = self.box_contract.encode_abi(fn_name=function_name, args=args)

        proposal_description = f"{self.device_name}, {msg}-{time.time()}"

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
        except ValueError as e:
            print(str(e))

        return {"device_name":self.device_name,"voted_for_proposal": proposal_id}
    

    def monitor_metrics(self):
        # event

        # sequence = query_construct(events,proposal_contents,actions_map)


        # metric_index = self.config['metric_index']

        # metrics_endpoint = f'http://localhost:6000/{metric_index}'  # (1)

        # response = requests.get(metrics_endpoint)
        # data = response.json()
        # old_metrics = data['value']                       # (2)

        # # Example change
        # # metrics1 = data['metrics1']
        # # metrics2 = data['metrics2']
        # # metrics3 = data['metrics3']

        while True:
            metric_index = self.config['metric_index']
            events = self.config['propose_on']['events']
            proposal_contents = self.config['propose_on']['proposal_contents']

            sequence = query_construct(events,proposal_contents)

            if not sequence:
                print("Error: No valid metrics found in event expressions")
                sys.exit(1)

            metrics = []
            for metric_name in sequence:
                act_metric = f"oasees_{metric_name}"
                query = f'{act_metric}{{metric_index="{metric_index}"}}'
                metrics.append((metric_name, act_metric, query))

            try:
                cluster_ip = subprocess.run(
                    ["kubectl", "get", "svc", "thanos-query", "-o", "jsonpath={.spec.clusterIP}"], 
                    capture_output=True, text=True, check=True
                ).stdout.strip()
            except:
                print("Error: Failed to get cluster IP")
                sys.exit(1)

            for q in sequence:
                query = q['query']

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
                                    self.proposal_cooldowns.append(proposal)
                                else:
                                    res = "No proposal needed."
                                print(res)

            # Example change
            # if metric1 > 0.5 and metric2 < 0.7:

            # if retrieved_value != old_metrics:
            #     print(f"Metrics changed to {retrieved_value}..")
            #     if (retrieved_value > event):                                             # (3)
            #         action = proposal_contents['action_value']                            # (4)
            #         msg = proposal_contents['msg']

            #     if(self.change_detected(action)):
            #         res = self.create_proposal(action,msg)
            #     else:
            #         res = "No proposal needed."
            #     old_metrics = retrieved_value
            #     print(res)
            # else:
            #     pass
            time.sleep(5)

    def monitor_proposals(self):
        '''
        As an example, this script does the following:

        1) Scans and retrieves all the proposals ever created in the DAO
        2) If it detects a 'Pending' proposal, it waits until it becomes 'Active'
        3) Always votes 'For' on the Active proposal


        As a suggestion, the following change could be made:

        - Add a decision-making mechanism that monitors a local metric and decides what to vote based on its value 
        '''
        _filter = self.governance_contract.events.ProposalCreated.create_filter(fromBlock="0x0", argument_filters={})
        while True:
            results = _filter.get_new_entries()
            desc = "No Active Proposals"
            for r in results:
                proposal_id = int(r['args']['proposalId'])
                state = proposal_states[self.governance_contract.functions.state(proposal_id).call()]

                if(state == 'Pending'):
                    while state == 'Pending':
                        time.sleep(5)
                        state = proposal_states[self.governance_contract.functions.state(proposal_id).call()]

                    print("Found active proposal. Voting now.")

                    if(state=='Active'):

                        # Example change:
                        # response = requests.get("http://localhost:6000/local-metrics")
                        # data = response.json()
                        # local_metric = data['local_metric']

                        # if local_metric > 0.3:
                        #   desc = vote(proposal_id,1,"Automatically voted For")
                        # elif local_metric > 0.1:
                        #   desc = vote(proposal_id,2,"Automatically voted Against")
                        # else:
                        #   pass    # Do not even vote

                        desc = self.vote(proposal_id,1,"Automated vote")     # 1-For, 2-Against
                        break
            
            print(desc)
            time.sleep(5)

    def monitor_value(self):
        '''
        This example script communicates with a video processing application for UC3, and does the following

        1) Retrieves the DAO's current value from the corresponding DAO SmartContract (Box, Treasury, etc.)
        2) If a change in the value is detected, a request to the appropriace UC application endpoint is made
            - If the DAO's value is changed to 1, it sends a request to change how the video feed is shown
            - If the DAO's value is changed to 2, it sends a request to apply a grayscale filter to the video feed


        As a suggestion, the following changes could be made:


        1) Change the application url that will handle the changes in App behavior
        2) Once again, map your DAO actions to a specific value and create a specific request based on the current value

        '''
        old_box_value = self.box_contract.functions.retrieve().call()
        while True:

            # application_server_url = 'http://10.160.1.133:5000'
            new_box_value = self.box_contract.functions.retrieve().call()
            
            if(old_box_value != new_box_value):
                print(f"BOX value changed from {old_box_value} to {new_box_value}!")

                # if new_box_value == 1:
                #     action = "change-mode"
                # else:
                #     action = "toggle-grayscale"

                endpoint = self.config['actions_map'][str(new_box_value)]

                result = requests.get(endpoint)

                print(result)
                old_box_value=new_box_value
                self.proposal_cooldowns.clear()
            else:
                print(f"No new metrics detected.")

            time.sleep(5)

    def change_detected(self,proposed_action):
        current_action = self.box_contract.functions.retrieve().call()

        return current_action != proposed_action


def validate_json_format(data):
    errors = []

    # Check top-level keys
    required_keys = {"metric_index", "propose_on", "actions_map"}
    missing_keys = required_keys - set(data.keys())
    if missing_keys:
        errors.append(f"Missing required keys: {missing_keys}")

    # Check 'propose_on' structure
    if "propose_on" in data:
        propose_on = data["propose_on"]
        if not isinstance(propose_on, dict):
            errors.append("'propose_on' must be a dictionary")
        else:
            # Check 'events' in 'propose_on'
            if "events" not in propose_on:
                errors.append("'propose_on' must contain 'events' list")
            elif not isinstance(propose_on["events"], list):
                errors.append("'events' must be a list")

            # Check 'proposal_contents' in 'propose_on'
            if "proposal_contents" not in propose_on:
                errors.append("'propose_on' must contain 'proposal_contents' list")
            elif not isinstance(propose_on["proposal_contents"], list):
                errors.append("'proposal_contents' must be a list")
            elif len(propose_on["proposal_contents"]) < 1:
                errors.append("'proposal_contents' must have at least one entry")
            else:
                for idx, content in enumerate(propose_on["proposal_contents"]):
                    if not isinstance(content, dict):
                        errors.append(f"Entry {idx} in 'proposal_contents' must be a dictionary")
                    else:
                        missing_content_keys = {"msg", "action_value"} - set(content.keys())
                        if missing_content_keys:
                            errors.append(f"Entry {idx} in 'proposal_contents' missing keys: {missing_content_keys}")

    # Check 'actions_map'
    if "actions_map" in data:
        actions_map = data["actions_map"]
        if not isinstance(actions_map, dict):
            errors.append("'actions_map' must be a list")
        elif len(actions_map) < 1:
            errors.append("'actions_map' must have at least one entry")
        # else:
        #     for idx, action in enumerate(actions_map):
        #         if not isinstance(action, dict):
        #             errors.append(f"Entry {idx} in 'actions_map' must be a dictionary")

    if errors:
        return False, " || ".join(errors)
    return True, "JSON format is valid"


def query_construct(events, proposal_contents, metric_prefix="oasees_"):
    """
    Construct PromQL queries from event expressions
    """
    queries = []
    
    for i, expr in enumerate(events):
        # Parse metric conditions: metric_name operator threshold
        conditions = re.findall(r'(\w+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)', expr)
        
        # Build PromQL conditions
        promql_conditions = []
        metrics = set()
        
        for metric, operator, threshold in conditions:
            full_metric = f"{metric_prefix}{metric}"
            metrics.add(full_metric)
            promql_conditions.append(f'({{__name__="{full_metric}"}} {operator} {threshold})')
        
        # Determine operator and build query
        metric_names = "|".join(metrics)
        
        if 'and' in expr.lower() and len(promql_conditions) > 1:
            # AND logic - multiply min aggregations
            min_conditions = []
            for metric, operator, threshold in conditions:
                full_metric = f"{metric_prefix}{metric}"
                min_conditions.append(f'min({{__name__="{full_metric}"}} {operator} bool {threshold}) by (metric_index)')
            
            query = f'''(
  {' * '.join(min_conditions)}
) == bool 1'''
        else:
            # OR logic or single condition
            if len(promql_conditions) == 1:
                # Single condition with bool
                metric, operator, threshold = conditions[0]
                full_metric = f"{metric_prefix}{metric}"
                query = f'{{__name__="{full_metric}"}} {operator} bool {threshold}'
            else:
                # Multiple OR conditions
                operator = 'or' if 'or' in expr.lower() else 'or'
                combined_conditions = f" {operator} ".join(promql_conditions)
                query = f'''{{__name__=~"{metric_names}"}} 
and 
(
  {combined_conditions}
)'''
        
        queries.append({
            'expression': expr,
            'query': query,
            'proposal': proposal_contents[i] if i < len(proposal_contents) else None,
            # 'action': actions_map[i] if i < len(actions_map) else None
        })
    
    return queries