import web3
from web3.middleware import geth_poa_middleware
from dotenv import load_dotenv
import os


env_file_path = '../.env'
load_dotenv(dotenv_path=env_file_path)

BLOCK_CHAIN_IP = os.getenv("BLOCK_CHAIN_IP")

deployer_account='0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
deployer_account = web3.Web3.toChecksumAddress(deployer_account)



w3 = web3.Web3(web3.HTTPProvider("http://{}:8545".format(BLOCK_CHAIN_IP)))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)



w3.eth.send_transaction({'to': deployer_account, 'value': 0})
