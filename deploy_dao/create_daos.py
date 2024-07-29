import web3
import json
import sys
import ipfshttpclient
import requests
from deploy_dao_template import deploy_dao
from dotenv import load_dotenv
import os

env_file_path = '../.env'
load_dotenv(dotenv_path=env_file_path)

IPFS_HOST = os.getenv("IPFS_HOST")
BLOCK_CHAIN_IP = os.getenv("BLOCK_CHAIN_IP")
INFRA_HOST = os.getenv("INFRA_HOST")



deployer_account='0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
deployer_account = web3.Web3.toChecksumAddress(deployer_account)
deployer_key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'


Daos_to_create = [

	{
		"DAO_NAME": "DRONES DAO",
		"DAO_DESC": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
		"MIN_DELAY": 0,
		"QUORUM_PERCENTAGE": 50,
		"VOTING_PERIOD": 10,
		"VOTING_DELAY": 0,
		"DAPP_SOURCE_PATH":"dapp_sources/sampleDAPP.html",
		"DAPP_INFO": {
			"NAME": "A DApp name",
			"DESCRIPTION": "A DApp description",
		}
	},

	{
		"DAO_NAME": "DAO 2",
		"DAO_DESC": "A second dao",
		"MIN_DELAY": 0,
		"QUORUM_PERCENTAGE": 4,
		"VOTING_PERIOD": 9,
		"VOTING_DELAY": 0,
		"DAPP_SOURCE_PATH":"dapp_sources/sampleDAPP.html",
		"DAPP_INFO": {
			"NAME": "A DApp name",
			"DESCRIPTION": "A DApp description",
		}
	},
	{
		"DAO_NAME": "DAO 3",
		"DAO_DESC": "A third dao",
		"MIN_DELAY": 0,
		"QUORUM_PERCENTAGE": 4,
		"VOTING_PERIOD": 9,
		"VOTING_DELAY": 0,
		"DAPP_SOURCE_PATH":"dapp_sources/sampleDAPP.html",
		"DAPP_INFO": {
			"NAME": "A DApp name",
			"DESCRIPTION": "A DApp description",
		}
	}

]
	


for dao in Daos_to_create:
	deploy_dao(deployer_account,deployer_key,dao)





