import web3
import json
import sys
import ipfshttpclient
import requests
from dotenv import load_dotenv
import os

env_file_path = '../.env'
load_dotenv(dotenv_path=env_file_path)

IPFS_HOST = os.getenv("IPFS_HOST")
BLOCK_CHAIN_IP = os.getenv("BLOCK_CHAIN_IP")
INFRA_HOST = os.getenv("INFRA_HOST")

w3 = web3.Web3(web3.HTTPProvider("http://{}:8545".format(BLOCK_CHAIN_IP)))
from web3.middleware import geth_poa_middleware
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

deployer_account='0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
deployer_account = web3.Web3.toChecksumAddress(deployer_account)
deployer_key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' 
MIN_DELAY = 0
QUORUM_PERCENTAGE = 50
VOTING_PERIOD = 10
VOTING_DELAY = 0

#### DEPLOY VOTING TOKEN################

f = open("dao_compiled_contracts/VoteTokenProvider.json")
data = json.load(f)
token_provider_abi=data['abi']
token_provider_bytecode=data['bytecode']
f.close()



f = open("dao_compiled_contracts/VoteToken.json")
data = json.load(f)
token_abi=data['abi']
f.close()



nonce = w3.eth.getTransactionCount(deployer_account)

token_provider_contract = w3.eth.contract(bytecode=token_provider_bytecode, abi=token_provider_abi)

transaction = token_provider_contract.constructor().buildTransaction({
    "gasPrice": w3.eth.gas_price,
    "chainId": 31337,
    "from": deployer_account,
    "nonce":w3.eth.getTransactionCount(deployer_account)
    }
)

signed_transaction = w3.eth.account.signTransaction(transaction, private_key=deployer_key)
transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)
txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)

token_provider_contract_address = txn_receipt['contractAddress']

token_provider_contract = w3.eth.contract(address=token_provider_contract_address, abi=token_provider_abi)


token_address = token_provider_contract.functions.token().call()


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
        "nonce":w3.eth.getTransactionCount(deployer_account)
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
        'nonce': w3.eth.getTransactionCount(deployer_account) + 0
    }
)
signed_tx= w3.eth.account.signTransaction(tx, private_key=deployer_key)
tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
# tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)


tx = timelock_contract.functions.grantRole(admin_role,deployer_account).buildTransaction({
    'chainId': 31337, 
    'gas': 2000000,  
    'gasPrice': w3.eth.gas_price,  
    'nonce': w3.eth.getTransactionCount(deployer_account) + 0
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
    "nonce":w3.eth.getTransactionCount(deployer_account) + 0
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

client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))

dao_content = {
    "dao_name": "Demo DAO 2",
    "dao_description": "A demo DAO",
    "governance_address": governance_address,
    "governance_abi": governance_abi,
    "token_provider_address": token_provider_contract_address,
    "token_provider_abi":token_provider_abi,
    "token_address": token_address,
    "token_abi": token_abi,
    "box_address": box_address,
    "box_abi": box_abi
}


dao_ipfs_hash = client.add_json(dao_content)
print("Use this hash for OASEES SDK ----> ",dao_ipfs_hash)
