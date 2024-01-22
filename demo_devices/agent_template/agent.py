import signal
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
from dao_event_watcher import event_watcher
from sqlite_utils import *


create_agentDB()

app = Flask(__name__)
CORS(app)

w3 = ''
marketplace_address='0x5FbDB2315678afecb367f032d93F642f64180aa3'
nft_address='0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'



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


vote_states={
	0:"Against",
	1:"For",
	2:"Abstain"
}



@app.route('/status',methods=["GET"])
def oasees_agent_is_up():

	account,_,device_name,dao_ipfs_hash, IPFS_HOST,BLOCK_CHAIN_IP = oasees_agent_info_get()
	if(account):
		return {
			"msg":{
				"status":"Configured",
				"IPFS_HOST":IPFS_HOST,
				"BLOCKCHAIN_IP":BLOCK_CHAIN_IP
			}

		}
	else:
		return {
			"msg":{
				"status":"NOT Configured",
				"IPFS_HOST":"",
				"BLOCKCHAIN_IP":""
			}

		}



@app.route('/deploy_algorithm',methods=["POST"])
def deploy_algorithm():
	
	_,_,device_name,_, IPFS_HOST,_= oasees_agent_info_get()
	data = request.json
	algorithm_ipfs_hash = data["algorithm_hash"]
	algorithm_name = data["algorithm_name"]


	f = open("{}".format(algorithm_name), "wb")
	client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
	algorithm_file = client.cat(algorithm_ipfs_hash)
	f.write(algorithm_file)
	f.close()

	return {"device_name":device_name,"algorithm_deployed":algorithm_name}


@app.route('/deploy_file', methods=["POST"])
def deploy_file():
	_,_,device_name,_,_,_= oasees_agent_info_get()
	file = request.files['file']
	file.save(file.filename)
	return (device_name + ": File deployed successfully.")
	


@app.route('/agent_config',methods=["POST"])
def agent_config():

	data = request.json
	account = data["account"]
	secret_key = data["secret_key"]
	device_name = data["device_name"]
	IPFS_HOST = data["IPFS_HOST"]
	BLOCK_CHAIN_IP = data["BLOCK_CHAIN_IP"]

	global w3
	w3 = web3.Web3(web3.Web3.HTTPProvider("http://{}:8545".format(BLOCK_CHAIN_IP)))
	w3.middleware_onion.inject(geth_poa_middleware, layer=0)

	insert_account_secret_key(account, secret_key, device_name,"", IPFS_HOST, BLOCK_CHAIN_IP)

	_,_,device_name,_,_,_=oasees_agent_info_get()
	thread = threading.Thread(target=event_watcher, args=(w3,marketplace_address,nft_address,account,))
	thread.start()

	return {
		"device_name":device_name,
		"ipfs_host":IPFS_HOST,
		"blockchain_ip":BLOCK_CHAIN_IP,
		"status":"ok"
	}



@app.route('/create_proposal',methods=["POST"])
def create_proposal():

	data = request.json
	proposal_description = data["proposal_description"]
	proposed_value = data["proposed_value"]

	account,_key,device_name,dao_ipfs_hash, IPFS_HOST,_= oasees_agent_info_get()

	client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
	ipfs_json = client.cat(dao_ipfs_hash)
	ipfs_json = ipfs_json.decode("UTF-8")
	ipfs_json = json.loads(ipfs_json)

	dao_address = ipfs_json['governance_address']
	dao_abi = ipfs_json['governance_abi']
	dao_contract = w3.eth.contract(address=dao_address, abi=dao_abi)

	box_address = ipfs_json['box_address']
	box_abi = ipfs_json['box_abi']
	box_contract = w3.eth.contract(address=box_address, abi=box_abi)

	

	args = (proposed_value,)
	function_name = 'store'
	function_signature = box_contract.encodeABI(fn_name=function_name, args=args)



	transaction = dao_contract.functions.propose(
		[box_address],
		[0],
		[function_signature],
		"{} {}".format(device_name,proposal_description)
	).buildTransaction({
		'chainId':  31337, 
		'gas': 2000000, 
		'gasPrice': w3.toWei('30', 'gwei'), 
		'nonce': w3.eth.getTransactionCount(account)
	})

	signed_tx = w3.eth.account.sign_transaction(transaction, private_key=_key)
	tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
	w3.eth.waitForTransactionReceipt(tx_hash)

	return {"device_name":device_name,"created_proposal":proposal_description}


@app.route('/check_dao',methods=["GET"])
def check_dao_subscription():

	_,_,_,dao_ipfs_hash,_,IPFS_HOST= oasees_agent_info_get()
	if(dao_ipfs_hash==''):
		return {"msg":"device is not a member to a DAO yet!"}
	else:

		client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
		ipfs_json = client.cat(dao_ipfs_hash)
		ipfs_json = ipfs_json.decode("UTF-8")
		ipfs_json = json.loads(ipfs_json)


		return {"msg":"device is member of {}".format(ipfs_json['dao_name'])}


@app.route('/vote',methods=["POST"])
def vote():
	data = request.json
	_vote = data["vote"]
	reason = data["reason"]

	account,_key,device_name,dao_ipfs_hash, IPFS_HOST,_= oasees_agent_info_get()

	client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
	ipfs_json = client.cat(dao_ipfs_hash)
	ipfs_json = ipfs_json.decode("UTF-8")
	ipfs_json = json.loads(ipfs_json)

	dao_address = ipfs_json['governance_address']
	dao_abi = ipfs_json['governance_abi']
	dao_contract = w3.eth.contract(address=dao_address, abi=dao_abi)


	token_address = ipfs_json['token_address']
	token_abi = ipfs_json['token_abi']

	token_contract = w3.eth.contract(address=token_address, abi=token_abi)


	_filter = dao_contract.events.ProposalCreated.createFilter(fromBlock="0x0", argument_filters={})
	results = _filter.get_new_entries()

	desc="No Active Proposals"

	for r in results:
		proposal_id = int(r['args']['proposalId'])
		state = proposal_states[dao_contract.functions.state(proposal_id).call()]
		


		if(state=='Active'):

			try:
				desc = r['args']['description']
				vote_function = dao_contract.functions.castVoteWithReason(proposal_id, _vote,"{} {}".format(device_name,reason))


				transaction = vote_function.buildTransaction({
				    'chainId': 31337, 
				    'gas': 2000000,  
				    'gasPrice': w3.toWei('30', 'gwei'),  
				    'nonce': w3.eth.getTransactionCount(account)
				})


				signed_tx = w3.eth.account.sign_transaction(transaction, private_key=_key)
				tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
				#w3.eth.waitForTransactionReceipt(tx_hash)

				#tx_receipt = w3.eth.getTransactionReceipt(tx_hash)
			except ValueError as e:
				desc=str(e)




	return {"device_name":device_name,"voted_for_proposal":desc}



@app.route('/monitor_proposals',methods=["POST"])
def monitor_prososals():
	data = request.json
	_state = data["state"]

	account,_key,device_name,dao_ipfs_hash, IPFS_HOST,_= oasees_agent_info_get()

	client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
	ipfs_json = client.cat(dao_ipfs_hash)
	ipfs_json = ipfs_json.decode("UTF-8")
	ipfs_json = json.loads(ipfs_json)


	dao_address = ipfs_json['governance_address']
	dao_abi = ipfs_json['governance_abi']
	dao_contract = w3.eth.contract(address=dao_address, abi=dao_abi)

	_filter = dao_contract.events.ProposalCreated.createFilter(fromBlock="0x0", argument_filters={})
	results = _filter.get_new_entries()


	proposals=[]
	proposal=None

	for r in results:
		_id = r['args']['proposalId']
		state = proposal_states[dao_contract.functions.state(_id).call()]
		desc = r['args']['description']
		vote_history=[]

		if(state==_state):
			res_votes = dao_contract.functions.proposalVotes(_id).call()
			_filter = dao_contract.events.VoteCast.createFilter(fromBlock="0x0", argument_filters={'proposalId':_id})
			res_cast_votes = _filter.get_new_entries()

			for r in res_cast_votes:

				vote_history.append({
					"support":vote_states[r["args"]["support"]],
					"reason":r["args"]["reason"]
					})


			proposal={
				"proposal_desc":desc,
				"votes_distribution":res_votes,
				"vote_details":vote_history

			}

		if(proposal):
			proposals.append(proposal)


	return {"resp":proposals}


def sigterm_handler():
	print("Received SIGTERM. Shutting down gracefully...")
	exit(0)

signal.signal(signal.SIGTERM, sigterm_handler)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)