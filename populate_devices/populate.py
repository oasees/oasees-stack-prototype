import requests
import ipfshttpclient
import web3
import os
from web3.middleware import geth_poa_middleware
import sys
import json
from dotenv import load_dotenv

env_file_path = '../.env'
load_dotenv(dotenv_path=env_file_path)
JUPYTER_API_IP=os.getenv("JUPYTER_API_IP")
IPFS_HOST=os.getenv("IPFS_HOST")
BLOCK_CHAIN_IP=os.getenv("BLOCK_CHAIN_IP")

env_file_path = '../.devices_env'
load_dotenv(dotenv_path=env_file_path)
DEVICES_IP= os.getenv("DEVICES_IP")

DEVICES = [
    {'device_name':os.getenv("device1_name"),"account":os.getenv("device1_addr"),"endpoint":os.getenv("device1_endpoint")},
    {'device_name':os.getenv("device2_name"),"account":os.getenv("device2_addr"),"endpoint":os.getenv("device2_endpoint")},
    {'device_name':os.getenv("device3_name"),"account":os.getenv("device3_addr"),"endpoint":os.getenv("device3_endpoint")},
    {'device_name':os.getenv("device4_name"),"account":os.getenv("device4_addr"),"endpoint":os.getenv("device4_endpoint")}
]


portal_account = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
portal_account = web3.Web3.toChecksumAddress(portal_account)
portal_key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'


w3 = web3.Web3(web3.HTTPProvider("http://{}:8545".format(BLOCK_CHAIN_IP)))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)


api_endpoint="http://{}:{}/ipfs_portal_contracts".format(JUPYTER_API_IP,6001)
print(api_endpoint)

response = requests.get(api_endpoint)

contracts_info=response.json()
contracts_info=contracts_info['portal_contracts']


market_address=contracts_info['marketplace_address']
market_abi=contracts_info['marketplace_abi']

nft_address=contracts_info['nft_address']
nft_abi=contracts_info['nft_abi']

market_contract = w3.eth.contract(address=market_address, abi=market_abi)
nft_contract = w3.eth.contract(address=nft_address, abi=nft_abi)


market_fee = market_contract.functions.LISTING_FEE().call()

price=1
i=0

for device in DEVICES:
    device_name = device['device_name']
    device_content = {
        "account": device['account'],
        "name":device_name,
        "device_endpoint": device['endpoint'],

    }
    metadata={
        "price":price,
        "title":device_name,
        "description": "A description for {}".format(device_name)
    }

    metadata = json.dumps(metadata)

    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    meta_hash = client.add_json(metadata)
    content_hash = client.add_json(device_content)

    client.close()


    
    transaction = nft_contract.functions.mint(content_hash).buildTransaction({
        'chainId': 31337,
        'gas': 2000000,
        'gasPrice': w3.eth.gas_price,
        'nonce': w3.eth.getTransactionCount(portal_account) + i
    })


    signed_transaction = w3.eth.account.signTransaction(transaction, private_key=portal_key)
    transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)
    txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
    tx_json = json.loads(w3.toJSON(txn_receipt))

    token_id=int(tx_json['logs'][2]['data'],16)
    print(token_id)


    transaction = market_contract.functions.makeDevice(nft_address,token_id,w3.toWei(price, 'ether'),meta_hash,True,False).buildTransaction({
        'value':market_fee,
        'chainId': 31337,
        'gas': 2000000,
        'gasPrice': w3.eth.gas_price,
        'nonce': w3.eth.getTransactionCount(portal_account)
    })


    signed_transaction = w3.eth.account.signTransaction(transaction, private_key=portal_key)
    transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)
    # i=1
