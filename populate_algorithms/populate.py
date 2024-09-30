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


def read_samples(folder_path):
    file_contents = {}
    file_descriptions = {}


    if not os.path.isdir(folder_path):
        print(f"Error: {folder_path} is not a directory.")
        return file_contents


    # for filename in os.listdir(folder_path):
    #     file_path = os.path.join(folder_path, filename)
    #     if os.path.isfile(file_path):
    #         with open(file_path, 'rb') as file:
    #             file_contents[filename] = file.read()

    for foldername in os.listdir(folder_path):
            subfolder_path = os.path.join(folder_path,foldername)
            if not os.path.isfile(subfolder_path):
                for filename in os.listdir(subfolder_path):
                    file_path = os.path.join(subfolder_path, filename)
                    if os.path.isfile(file_path):
                            if ".md" in file_path:
                                with open(file_path, 'r') as file:
                                    file_descriptions[filename] = file.read()
                            else:
                                with open(file_path, 'rb') as file:
                                    file_contents[filename] = file.read()

    return file_contents, file_descriptions



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

folders=read_samples('samples')
file_contents = folders[0]
description_contents= folders[1]

market_fee = market_contract.functions.LISTING_FEE().call()

price=1
i=0
for fc in file_contents.keys():
    algo_name = fc
    algo_content = file_contents[fc]
    metadata={
        "price":price,
        "title":algo_name,
        "description": description_contents[fc.split(".")[0]+".md"],
        "tags":['ML']
    }

    metadata = json.dumps(metadata)

    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    meta_hash = client.add_json(metadata)
    content_hash = client.add_bytes(algo_content)

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


    transaction = market_contract.functions.makeItem(nft_address,token_id,w3.toWei(price, 'ether'),meta_hash).buildTransaction({
        'value':market_fee,
        'chainId': 31337,
        'gas': 2000000,
        'gasPrice': w3.eth.gas_price,
        'nonce': w3.eth.getTransactionCount(portal_account)
    })


    signed_transaction = w3.eth.account.signTransaction(transaction, private_key=portal_key)
    transaction_hash = w3.eth.sendRawTransaction(signed_transaction.rawTransaction)
    # i = 1