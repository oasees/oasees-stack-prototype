import web3
import json
import ast
import sys
import os


portal_account = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
portal_account = web3.Web3.toChecksumAddress(portal_account)
portal_key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'


def deploy_marketplace_contract(w3):

    f = open("compiled_contracts/OaseesMarketplace.json")
    data = json.load(f)
    market_place_abi=data['abi']
    market_place_bytecode=data['bytecode']
    f.close()

    nonce = w3.eth.getTransactionCount(portal_account)

    market_place_contract = w3.eth.contract(bytecode=market_place_bytecode, abi=market_place_abi)


    transaction = market_place_contract.constructor().buildTransaction({
        "gasPrice": w3.eth.gas_price,
        "chainId": 31337,
        "from": portal_account,
        "nonce":w3.eth.getTransactionCount(portal_account)
        }
    )


    signed_transaction = w3.eth.account.signTransaction(transaction, private_key=portal_key)
    transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)


    txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
    market_place_address = txn_receipt['contractAddress']
    
    return market_place_address , market_place_abi

def deploy_nft_contract(w3,market_place_address):

	f = open("compiled_contracts/OaseesNFT.json")
	data = json.load(f)
	nft_abi=data['abi']
	nft_bytecode=data['bytecode']
	f.close()


	nft_contract = w3.eth.contract(bytecode=nft_bytecode, abi=nft_abi)
	transaction = nft_contract.constructor(market_place_address).buildTransaction({
	    "gasPrice": w3.eth.gas_price,
	    "chainId": 31337,
	    "from": portal_account,
	    "nonce":w3.eth.getTransactionCount(portal_account)
	    }
	)


	signed_transaction = w3.eth.account.signTransaction(transaction, private_key=portal_key)
	transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)


	txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
	nft_address = txn_receipt['contractAddress']

	return nft_address, nft_abi

def deploy_daoIndexer(w3):

	f = open("compiled_contracts/DaoStorage.json")
	data = json.load(f)
	daoIndexer_abi=data['abi']
	daoIndexer_bytecode=data['bytecode']
	f.close()


	daoIndexer_contract = w3.eth.contract(bytecode=daoIndexer_bytecode, abi=daoIndexer_abi)
	transaction = daoIndexer_contract.constructor().buildTransaction({
	    "gasPrice": w3.eth.gas_price,
	    "chainId": 31337,
	    "from": portal_account,
	    "nonce":w3.eth.getTransactionCount(portal_account)
	    }
	)


	signed_transaction = w3.eth.account.signTransaction(transaction, private_key=portal_key)
	transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)


	txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
	daoIndexer_address = txn_receipt['contractAddress']

	return daoIndexer_address, daoIndexer_abi


def get_account_token_specs():
	f = open("compiled_contracts/AccountNFT.json")
	data = json.load(f)
	accountToken_abi=data['abi']
	accountToken_bytecode=data['bytecode']
	f.close()

	return accountToken_abi , accountToken_bytecode


def get_daoStorage_specs():
	f = open("compiled_contracts/DaoStorage.json")
	data = json.load(f)
	daoStorage_abi=data['abi']
	daoStorage_bytecode=data['bytecode']
	f.close()

	return daoStorage_abi , daoStorage_bytecode


def transer_dao_tokens(w3,account,token_address,token_abi):

	account = web3.Web3.toChecksumAddress(account)
	token_contract = w3.eth.contract(address=token_address, abi=token_abi)

	tx = token_contract.functions.transfer(account,20).buildTransaction({
		'chainId': 31337, 
		'gas': 2000000,  
		'gasPrice': w3.eth.gas_price,  
		'nonce': w3.eth.getTransactionCount(portal_account)
		}
	)

	signed_tx= w3.eth.account.signTransaction(tx, private_key=portal_key)
	tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
	tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
