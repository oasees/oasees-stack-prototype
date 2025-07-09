import web3
from web3.middleware import geth_poa_middleware
import ipfshttpclient
import json
import time
import sys
import requests


def event_watcher(info_dict):

    w3  = web3.Web3(info_dict['w3'])
    account = info_dict['device_account']
    pkey = info_dict['pkey']
    marketplace_contract = info_dict['marketplace_contract']
    nft_contract = info_dict['nft_contract']
    dao_info = info_dict['dao_info']
    BLOCKSCOUT_API_URL = info_dict['BLOCKSCOUT_API_URL']

    dao_id = None

    while (not dao_id):
        try:
            daoJoin_filter = marketplace_contract.events.DaoJoined.createFilter(fromBlock='0x0', toBlock='latest', argument_filters={})
            results = daoJoin_filter.get_new_entries()
            for r in results:
                event = r['args']
                if(event['member_address']==account):
                    dao_id = event['tokenId']
                    break

        except Exception as e:
            print(f"Error: {e}")


        time.sleep(5)


    
    joined_daos = marketplace_contract.functions.getJoinedDaos().call({'from': account})

    for dao in joined_daos:
        if dao_id == dao[0]:
            governance_address = dao[0][1]
            vote_token_address = dao[0][3]
            box_address = dao[0][4]
            break

    governance_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{governance_address}")
    governance_abi = governance_info.json()['abi']
    box_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{box_address}")
    box_abi = box_info.json()['abi']
    vote_token_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{vote_token_address}")
    vote_token_abi = vote_token_info.json()['abi']


    governance_contract = w3.eth.contract(address=governance_address, abi=governance_abi)
    box_contract = w3.eth.contract(address=box_address, abi=box_abi)
    vote_token_contract = w3.eth.contract(address=vote_token_address, abi=vote_token_abi)

    delegate_function=vote_token_contract.functions.delegate(account)

    delegate_transaction = delegate_function.buildTransaction({
        'chainId': 31337, 
        'gas': 2000000,
        'from':account,  
        'gasPrice': w3.toWei('30', 'gwei'),  
        'nonce': w3.eth.get_t(account)
    })

    signed_tx = w3.eth.account.sign_transaction(delegate_transaction, private_key= pkey)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

    dao_info['governance'] = governance_contract
    dao_info['token'] = vote_token_contract
    dao_info['box'] = box_contract