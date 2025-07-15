import web3
from dotenv import load_dotenv
import os
import requests


def load_contracts(BLOCKCHAIN_URL, BLOCKSCOUT_API_URL):
    
    # BLOCKCHAIN_URL = "http://10.160.3.172:8545"
    # BLOCKSCOUT_API_URL = "http://10.160.3.172:8082/api/v2"

    w3 = web3.Web3(web3.HTTPProvider(BLOCKCHAIN_URL))

    

    marketplace_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    nft_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

    marketplace_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{marketplace_address}")
    marketplace_abi = marketplace_info.json()['abi']

    nft_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{nft_address}")
    nft_abi = nft_info.json()['abi']


    marketplace_contract = w3.eth.contract(address=marketplace_address, abi=marketplace_abi)
    nft_contract = w3.eth.contract(address=nft_address, abi=nft_abi)

    return w3, marketplace_contract, nft_contract