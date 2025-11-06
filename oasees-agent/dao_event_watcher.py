from web3.middleware import geth_poa_middleware
import time
import requests


def event_watcher(info_dict):


    old_dao_id = None

    while True:
        w3  = info_dict['w3']
        account = info_dict['account']
        private_key = info_dict['private_key']
        marketplace_contract = info_dict['marketplace_contract']
        nft_contract = info_dict['nft_contract']
        dao_info = info_dict['dao_info']
        BLOCKSCOUT_API_URL = info_dict['BLOCKSCOUT_API_URL']

        dao_id = None

        while (not dao_id):
            membership = []
            try:
                daoJoin_filter = marketplace_contract.events.DaoJoined.create_filter(fromBlock='0x0', toBlock='latest', argument_filters={})
                results = daoJoin_filter.get_new_entries()
                for r in results:
                    event = r['args']
                    if(event['member_address']==account):
                        membership.append(event['tokenId'])
                if(membership):
                    dao_id = membership[-1]

            except Exception as e:
                print(f"Error: {e}")


            time.sleep(5)

        if(dao_id!=old_dao_id):
            # print(dao_id)
            joined_daos = marketplace_contract.functions.getJoinedDaos().call({'from': account})

            for dao in joined_daos:
                if dao_id == dao[0]:
                    governance_address = dao[1]
                    vote_token_address = dao[3]
                    box_address = dao[4]
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

            delegate_transaction = delegate_function.build_transaction({
                'chainId': 31337, 
                # 'gas': 22000,
                'from':account,  
                'gasPrice': w3.eth.gas_price,  
                'nonce': w3.eth.get_transaction_count(account)
            })

            signed_tx = w3.eth.account.sign_transaction(delegate_transaction, private_key= private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            dao_info['governance'] = governance_contract
            dao_info['timelock_address'] = dao_info['governance'].functions.timelock().call() 
            dao_info['token'] = vote_token_contract
            dao_info['box'] = box_contract
            dao_info['restart'] = True

            print(f"Joined DAO found: {dao_info}")

            old_dao_id = dao_id