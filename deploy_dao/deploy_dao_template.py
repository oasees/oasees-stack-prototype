import web3
import json
import sys
import ipfshttpclient
import requests
from dotenv import load_dotenv
import os

env_file_path = '../.env'  # Replace this with the actual path to your .env file
load_dotenv(dotenv_path=env_file_path)

IPFS_HOST = os.getenv("IPFS_HOST")
BLOCK_CHAIN_IP = os.getenv("BLOCK_CHAIN_IP")
INFRA_HOST = os.getenv("INFRA_HOST")
DEVICES_IP= os.getenv("DEVICES_IP")



w3 = web3.Web3(web3.HTTPProvider("http://{}:8545".format(BLOCK_CHAIN_IP)))
from web3.middleware import geth_poa_middleware
w3.middleware_onion.inject(geth_poa_middleware, layer=0)



def deploy_dao(deployer_account,deployer_key,dao_args):

	ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' 

	DAO_NAME = dao_args['DAO_NAME']
	DAO_DESC = dao_args['DAO_DESC']
	MIN_DELAY = dao_args['MIN_DELAY']
	QUORUM_PERCENTAGE = dao_args['QUORUM_PERCENTAGE']
	VOTING_PERIOD = dao_args['VOTING_PERIOD']
	VOTING_DELAY = dao_args['VOTING_DELAY']


	#### DEPLOY VOTING TOKEN################

	f = open("dao_compiled_contracts/Token.json")
	data = json.load(f)
	token_abi=data['abi']
	token_bytecode=data['bytecode']
	f.close()



	nonce = w3.eth.getTransactionCount(deployer_account)

	token_contract = w3.eth.contract(bytecode=token_bytecode, abi=token_abi)

	transaction = token_contract.constructor("DAO_TOKEN","DT",100).buildTransaction({
		"gasPrice": w3.eth.gas_price,
		"chainId": 31337,
		"from": deployer_account,
		"nonce":w3.eth.getTransactionCount(deployer_account)
		}
	)






	signed_transaction = w3.eth.account.signTransaction(transaction, private_key=deployer_key)
	transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)

	txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
	token_address = txn_receipt['contractAddress']


	print(token_address)



	token_contract = w3.eth.contract(address=token_address, abi=token_abi)


	delegate_function=token_contract.functions.delegate(deployer_account)


	delegate_transaction = delegate_function.buildTransaction({
		'chainId': 31337, 
		'gas': 2000000,  
		'gasPrice': w3.eth.gas_price, 
		"from": deployer_account,
		'nonce': w3.eth.getTransactionCount(deployer_account)
	})

	signed_tx = w3.eth.account.sign_transaction(delegate_transaction, private_key=deployer_key)
	tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
	# w3.eth.waitForTransactionReceipt(tx_hash)

	i = 1

	for device in dao_args['DEVICES']:
		tx = token_contract.functions.transfer(web3.Web3.toChecksumAddress(device['account']),20).buildTransaction({
		    'chainId': 31337, 
		    'gas': 2000000,  
		    'gasPrice': w3.eth.gas_price,  
		    'nonce': w3.eth.getTransactionCount(deployer_account) +i
			}
		)
		signed_tx= w3.eth.account.signTransaction(tx, private_key=deployer_key)
		tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
		# tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
		s=token_contract.functions.balanceOf(device['account']).call()
		print("voter {} has {} dao tokens".format(device['account'],s))
		i += 1






	###################################################################################################################
	#### DEPLOY TIMELOCK################



	f = open("dao_compiled_contracts/TimeLock.json")
	data = json.load(f)
	timelock_abi=data['abi']
	timelock_bytecode=data['bytecode']
	f.close()



	timelock_contract = w3.eth.contract(bytecode=timelock_bytecode, abi=timelock_abi)


	tx = timelock_contract.constructor(
		MIN_DELAY,
		[],
		[]
		).buildTransaction({
			"gasPrice": w3.eth.gas_price,
			"chainId": 31337,
			"from": deployer_account,
			"nonce":w3.eth.getTransactionCount(deployer_account) + i
			}
	)


	signed_tx = w3.eth.account.signTransaction(tx, private_key=deployer_key)
	tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)

	txn_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
	timelock_address = txn_receipt['contractAddress']


	###################################################################################################################
	#### DEPLOY GOVERNANCE################



	f = open("dao_compiled_contracts/Governance.json")
	data = json.load(f)
	governance_abi=data['abi']
	governance_bytecode=data['bytecode']
	f.close()

	governance_contract = w3.eth.contract(bytecode=governance_bytecode, abi=governance_abi)
	tx = governance_contract.constructor(
		token_address,
		timelock_address,
		QUORUM_PERCENTAGE,
		VOTING_DELAY,
		VOTING_PERIOD
		
		).buildTransaction({
			"gasPrice": w3.eth.gas_price,
			"chainId": 31337,
			"from": deployer_account,
			"nonce":w3.eth.getTransactionCount(deployer_account)
			}
	)

	signed_tx = w3.eth.account.signTransaction(tx, private_key=deployer_key)
	tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)

	txn_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
	governance_address = txn_receipt['contractAddress']


	timelock_contract = w3.eth.contract(address=timelock_address, abi=timelock_abi)

	proposer_role = timelock_contract.functions.PROPOSER_ROLE().call()
	executor_role = timelock_contract.functions.EXECUTOR_ROLE().call()
	admin_role = timelock_contract.functions.TIMELOCK_ADMIN_ROLE().call()




	tx = timelock_contract.functions.grantRole(proposer_role,governance_address).buildTransaction({
			'chainId': 31337, 
			'gas': 2000000,  
			'gasPrice': w3.eth.gas_price,  
			'nonce': w3.eth.getTransactionCount(deployer_account)
		}
	)
	signed_tx= w3.eth.account.signTransaction(tx, private_key=deployer_key)
	tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
	# tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)




	tx = timelock_contract.functions.grantRole(executor_role,governance_address).buildTransaction({
			'chainId': 31337, 
			'gas': 2000000,  
			'gasPrice': w3.eth.gas_price,  
			'nonce': w3.eth.getTransactionCount(deployer_account) + 1
		}
	)
	signed_tx= w3.eth.account.signTransaction(tx, private_key=deployer_key)
	tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
	# tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)


	tx = timelock_contract.functions.grantRole(admin_role,deployer_account).buildTransaction({
	    'chainId': 31337, 
	    'gas': 2000000,  
	    'gasPrice': w3.eth.gas_price,  
	    'nonce': w3.eth.getTransactionCount(deployer_account) + 2
		}
	)
	signed_tx= w3.eth.account.signTransaction(tx, private_key=deployer_key)
	tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
	# tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)



	f = open("dao_compiled_contracts/Box.json")
	data = json.load(f)
	box_abi=data['abi']
	box_bytecode=data['bytecode']
	f.close()

	box_contract = w3.eth.contract(bytecode=box_bytecode, abi=box_abi)


	transaction = box_contract.constructor().buildTransaction({
		"gasPrice": w3.eth.gas_price,
		"chainId": 31337,
		"from": deployer_account,
		"nonce":w3.eth.getTransactionCount(deployer_account) + 3
		}
	)

	signed_transaction = w3.eth.account.signTransaction(transaction, private_key=deployer_key)
	transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)

	txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
	box_address = txn_receipt['contractAddress']

	box_contract = w3.eth.contract(address=box_address, abi=box_abi)


	tx = box_contract.functions.transferOwnership(timelock_address).buildTransaction({
	    'chainId': 31337, 
	    'gas': 2000000,  
	    'gasPrice': w3.eth.gas_price,  
	    'nonce': w3.eth.getTransactionCount(deployer_account)
		}
	)
	signed_tx= w3.eth.account.signTransaction(tx, private_key=deployer_key)
	tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
	# tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)



	client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))


	dao_info = {
		"dao_name": DAO_NAME,
		"dao_desc": DAO_DESC,
	    "governance_address": governance_address,
	    "governance_abi": governance_abi,
	    "token_address": token_address,
	    "token_abi": token_abi,
	    "box_address": box_address,
	    "box_abi": box_abi,
	    "devices": dao_args['DEVICES']
	}


	dao_ipfs_hash = client.add_json(dao_info)
	print("IPFS HASH ----> ",dao_ipfs_hash)
	client.close()



	response = requests.get('http://{}:6001/ipfs_portal_contracts'.format(INFRA_HOST))
	response = response.json()
	portal_contracts = response["portal_contracts"]

	dao_indexer_address = portal_contracts["dao_indexer_address"]
	dao_indexer_abi = portal_contracts["dao_indexer_abi"]

	dao_indexer_contract = w3.eth.contract(address=dao_indexer_address, abi=dao_indexer_abi)




	transaction = dao_indexer_contract.functions.addHash(dao_ipfs_hash).buildTransaction({
	    'chainId': 31337, 
	    'gas': 2000000,  
	    'gasPrice': w3.eth.gas_price,  
	    'nonce': w3.eth.getTransactionCount(deployer_account) + 1
	})


	signed_transaction = w3.eth.account.signTransaction(transaction, private_key=deployer_key)
	transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)


	txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
