import threading
from flask import Flask, jsonify, request
import requests
import json
import sqlite3
from flask_cors import CORS
import ipfshttpclient
import web3
from web3.middleware import geth_poa_middleware
import os
from time import sleep,time

app = Flask(__name__)

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

#################### FIXED ADDRESSES ####################
BLOCKCHAIN_URL = "http://10.160.3.172:8545"
BLOCKSCOUT_API_URL = "http://10.160.3.172:8082/api/v2"

marketplace_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
nft_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
#########################################################


#################### TODO: EACH AGENT CREATES A UNIQUE BLOCKCHAIN ACCOUNT ####################

# FOR THE MOMENT USE THE SAME ACCOUNT THAT YOU'RE USING IN METAMASK
account = "..."
private_key = "..."

##############################################################################################


w3 = web3.Web3(web3.HTTPProvider(BLOCKCHAIN_URL))


marketplace_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{marketplace_address}")
marketplace_abi = marketplace_info.json()['abi']


marketplace_contract = w3.eth.contract(address=marketplace_address, abi=marketplace_abi)


res = marketplace_contract.functions.getJoinedDaos().call({'from':account})
last_dao_idx = len(res) -1 
dao_id  = res[last_dao_idx][0]
governance_address = res[last_dao_idx][1]
vote_token_address = res[last_dao_idx][3]
box_address = res[last_dao_idx][4]


governance_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{governance_address}")
governance_abi = governance_info.json()['abi']
box_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{box_address}")
box_abi = box_info.json()['abi']
vote_token_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{vote_token_address}")
vote_token_abi = vote_token_info.json()['abi']


governance_contract = w3.eth.contract(address=governance_address, abi=governance_abi)
box_contract = w3.eth.contract(address=box_address, abi=box_abi)
vote_token_contract = w3.eth.contract(address=vote_token_address, abi=vote_token_abi)

device_name = "Oasees DEVICE"



#################### API FUNCTIONS - NO CUSTOMIZATION NEEDED ####################

def change_detected(proposed_action):
    current_action = box_contract.functions.retrieve().call()

    return current_action != proposed_action

def create_proposal(value):
    delegate()
    args = (value,)
    function_name = 'store'
    function_signature = box_contract.encode_abi(fn_name=function_name, args=args)

    proposal_description = f"Device: Change value to {value}-{time()}"

    transaction = governance_contract.functions.propose(
        [box_address],
        [0],
        [function_signature],
        "{} {}".format(device_name,proposal_description)
    ).build_transaction({
        'chainId':  31337, 
        'gas': 2000000, 
        'gasPrice': w3.to_wei('30', 'gwei'), 
        'nonce': w3.eth.get_transaction_count(account)
    })

    signed_tx = w3.eth.account.sign_transaction(transaction, private_key= private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    w3.eth.wait_for_transaction_receipt(tx_hash)

    return {"device_name":device_name,"created_proposal":proposal_description}

def delegate():
    delegate_function=vote_token_contract.functions.delegate(account)

    delegate_transaction = delegate_function.build_transaction({
        'chainId': 31337, 
        'gas': 2000000,
        'from':account,  
        'gasPrice': w3.to_wei('30', 'gwei'),  
        'nonce': w3.eth.get_transaction_count(account)
    })

    signed_tx = w3.eth.account.sign_transaction(delegate_transaction, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

    print("Delegation transaction sent.")


def vote(proposal_id,_vote,reason):
    try:
        # desc = r['args']['description']
        vote_function = governance_contract.functions.castVoteWithReason(proposal_id, _vote,"{} {}".format(device_name,reason))


        transaction = vote_function.build_transaction({
            'chainId': 31337, 
            'gas': 2000000,  
            'gasPrice': w3.to_wei('30', 'gwei'),  
            'nonce': w3.eth.get_transaction_count(account)
        })


        signed_tx = w3.eth.account.sign_transaction(transaction, private_key=private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        w3.eth.wait_for_transaction_receipt(tx_hash)

        tx_receipt = w3.eth.get_transaction_receipt(tx_hash)
    except ValueError as e:
        print(str(e))

    return {"device_name":device_name,"voted_for_proposal": proposal_id}

##################################################################################


#################### CUSTOM - METRICS ENDPOINT MONITOR ####################
def monitor_metrics():
    '''
    As an example, this script does the following:

    1) Requests metrics from a metrics endpoint (here the endpoint is http://localhost:6000/value)
    2) Accesses the metrics in the retrieved response:
        - In this case the response comes in JSON format.
        - The metrics can be found in the "value" field of the JSON file.
    3) If a change is detected in the metrics, a decision is made based on the old metrics values and the new:
        - If the new metrics have a larger value than the old ones:
            - Check if the DAO's value is 1. If it isn't, create a proposal to change it to 1
        - If they have a smaller one:
            - Check if the DAO's value is 2. If it isn't, create a proposal to change it to 2


        
    As a suggestion, the following changes could be made to fit each Use Case:

    1) Change the endpoint that the metrics are retrieved from
    2) Use the fields that contain your specific metrics
    3) Change the condition that triggers a proposal.
    4) Map your DAO actions to a specific value and use that to create the proposal
        - In the example above, values 1 and 2 map to different application behaviors
    '''
    metrics_endpoint = 'http://localhost:6000/value'  # (1)

    response = requests.get(metrics_endpoint)
    data = response.json()
    old_metrics = data['value']                       # (2)

    # Example change
    # metrics1 = data['metrics1']
    # metrics2 = data['metrics2']
    # metrics3 = data['metrics3']

    while True:
        response = requests.get(metrics_endpoint)
        data = response.json()
        retrieved_value = data['value']               # (2)

        # Example change
        # if metric1 > 0.5 and metric2 < 0.7:

        if retrieved_value != old_metrics:
            print(f"Metrics changed to {retrieved_value}..")
            if (retrieved_value > old_metrics):       # (3)
                action = 1                            # (4)
            else:
                action = 2                            # (4)

            if(change_detected(action)):
                res = create_proposal(action)
            else:
                res = "No proposal needed."
            old_metrics = retrieved_value
            print(res)
        else:
            pass
        sleep(5)



#################### CUSTOM - PROPOSAL MONITOR ####################
def monitor_proposals():
    '''
    As an example, this script does the following:

    1) Scans and retrieves all the proposals ever created in the DAO
    2) If it detects a 'Pending' proposal, it waits until it becomes 'Active'
    3) Always votes 'For' on the Active proposal


    As a suggestion, the following change could be made:

    - Add a decision-making mechanism that monitors a local metric and decides what to vote based on its value 
    '''
    _filter = governance_contract.events.ProposalCreated.create_filter(fromBlock="0x0", argument_filters={})
    while True:
        results = _filter.get_new_entries()
        desc = "No Active Proposals"
        for r in results:
            proposal_id = int(r['args']['proposalId'])
            state = proposal_states[governance_contract.functions.state(proposal_id).call()]

            if(state == 'Pending'):
                while state == 'Pending':
                    sleep(5)
                    state = proposal_states[governance_contract.functions.state(proposal_id).call()]

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

                    desc = vote(proposal_id,1,"Automated vote")     # 1-For, 2-Against
                    break
        
        print(desc)
        sleep(5)


#################### CUSTOM - DAO VALUE MONITOR ####################
def monitor_value():
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
    old_box_value = box_contract.functions.retrieve().call()
    while True:

        application_server_url = 'http://10.160.1.133:5000'
        new_box_value = box_contract.functions.retrieve().call()
        
        if(old_box_value != new_box_value and (new_box_value==2 or new_box_value==1)):
            print(f"BOX value changed from {old_box_value} to {new_box_value}!")

            if new_box_value == 1:
                action = "change-mode"
            else:
                action = "toggle-grayscale"

            result = requests.get(f'{application_server_url}/{action}')

            print(result)
            old_box_value=new_box_value
        else:
            print(f"No new metrics detected.")

        sleep(5)



proposal_thread = threading.Thread(target=monitor_proposals, name="Proposal Monitor")
proposal_thread.start()

metrics_thread = threading.Thread(target=monitor_metrics, name="Metrics Monitor")
metrics_thread.start()

exec_thread = threading.Thread(target=monitor_value, name="Box Value Monitor")
exec_thread.start()


@app.route('/')
def hello():
    return jsonify("Works")

if __name__=='__main__':
    app.run()