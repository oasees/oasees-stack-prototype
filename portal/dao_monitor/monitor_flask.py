from flask import Flask, Response
from flask_cors import CORS
from web3 import Web3
import json

app = Flask(__name__)


PORTAL_URL = os.getenv('PORTAL_URL')
INFRA_HOST = os.getenv('INFRA_HOST')
IPFS_HOST = os.getenv('IPFS_HOST')
PORTAL_PORT = 3000
BLOCK_CHAIN_IP = os.getenv('BLOCK_CHAIN_IP')
BLOCK_CHAIN_PORT = 8545


CORS(app, resources={
        r"/sse_proposals": {"origins": "http://{}:{}".format(PORTAL_URL,PORTAL_PORT)},
        r"/sse_votes": {"origins": "http://{}:{}".format(PORTAL_URL,PORTAL_PORT)}
        }
    )


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



@app.route('/sse_proposals')
def sse_proposals():


    contract_address = request.args.get("dao_address")
    contract_abi = request.args.get("dao_abi")

    w3 = Web3(Web3.HTTPProvider("http://{}:{}".format(BLOCK_CHAIN_IP,BLOCK_CHAIN_PORT)))
    contract = w3.eth.contract(address=contract_address, abi=contract_abi)

    def event_stream():
        current_block = w3.eth.blockNumber
        print(current_block)
        filter = contract.events.ProposalCreated.createFilter(fromBlock="0x0")
        for event in filter.get_new_entries():
            ev_json ={
                "event_id":event['blockNumber'],
                "proposal_id":event['args']['proposalId'],
                "status":proposal_states[contract.functions.state(event['args']['proposalId']).call()],
                "text":event['args']['description']
            }
            yield f"data: {json.dumps(ev_json)}\n\n"

    return Response(event_stream(), content_type='text/event-stream')

@app.route('/sse_votes')
def sse_votes():



    contract_address = request.args.get("dao_address")
    contract_abi = request.args.get("dao_abi")


    w3 = Web3(Web3.HTTPProvider("http://{}:{}".format(BLOCK_CHAIN_IP,BLOCK_CHAIN_PORT)))
    contract = w3.eth.contract(address=contract_address, abi=contract_abi)



    def event_stream():
        current_block = w3.eth.blockNumber
        print(meta_hash)
        filter = contract.events.VoteCast.createFilter(fromBlock="0x0")
        for event in filter.get_new_entries():
            ev_json ={
                "event_id":event['blockNumber'],
                "support":event['args']['support'],
                "reason":event['args']['reason']
            }
            yield f"data: {json.dumps(ev_json)}\n\n"

    return Response(event_stream(), content_type='text/event-stream')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)