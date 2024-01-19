import web3
from web3.middleware import geth_poa_middleware
import ipfshttpclient
import json
import time
import sys
from sqlite_utils import *
import requests


def event_watcher(w3,marketplace_address,nft_address,device_account):


    f = open("compiled_contracts/OaseesNFT.json")
    data = json.load(f)
    nft_abi=data['abi']
    f.close()

    f = open("compiled_contracts/OaseesMarketplace.json")
    data = json.load(f)
    marketplace_abi=data['abi']
    f.close()

    marketplace_contract = w3.eth.contract(address=marketplace_address, abi=marketplace_abi)



    nft_contract = w3.eth.contract(address=nft_address, abi=nft_abi)


    DAO_HASH=None

    while (not DAO_HASH):
        try:

            daoJoin_filter = marketplace_contract.events.DaoJoined.createFilter(fromBlock='0x0', toBlock='latest', argument_filters={})
            results = daoJoin_filter.get_new_entries()
            for r in results:
                event = r['args']
                if(event['member_address']==device_account):
                    tokenId = event['tokenId']
                    DAO_HASH = nft_contract.functions.tokenURI(tokenId).call()
                    update_dao_hash(DAO_HASH)
                    break

        except Exception as e:
            print(f"Error: {e}")


        time.sleep(1)


    
    dao_ipfs_hash = DAO_HASH

    account,_key,device_name,_,IPFS_HOST,_ = oasees_agent_info_get()
    account = web3.Web3.toChecksumAddress(account)


    update_dao_hash(dao_ipfs_hash)

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

    delegate_function=token_contract.functions.delegate(account)

    delegate_transaction = delegate_function.buildTransaction({
        'chainId': 31337, 
        'gas': 2000000,
        'from':account,  
        'gasPrice': w3.toWei('30', 'gwei'),  
        'nonce': w3.eth.getTransactionCount(account)
    })

    signed_tx = w3.eth.account.sign_transaction(delegate_transaction, private_key=_key)
    tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)


    return DAO_HASH



