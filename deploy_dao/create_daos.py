import web3
import json
import sys
import ipfshttpclient
import requests
from deploy_dao_template import deploy_dao
from dotenv import load_dotenv
import os

env_file_path = '../.env'  # Replace this with the actual path to your .env file
load_dotenv(dotenv_path=env_file_path)

IPFS_HOST = os.getenv("IPFS_HOST")
BLOCK_CHAIN_IP = os.getenv("BLOCK_CHAIN_IP")
INFRA_HOST = os.getenv("INFRA_HOST")



deployer_account='0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
deployer_account = web3.Web3.toChecksumAddress(deployer_account)
deployer_key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

env_file_path = '../.devices_env'
load_dotenv(dotenv_path=env_file_path)
DEVICES_IP= os.getenv("DEVICES_IP")


Daos_to_create = [

	{
		"DAO_NAME": "DRONES DAO",
		"DAO_DESC": "A dao for drones",
		"MIN_DELAY": 0,
		"QUORUM_PERCENTAGE": 50,
		"VOTING_PERIOD": 10,
		"VOTING_DELAY": 0,
		"DEVICES":[
			{'device_name':"Drone1","account":os.getenv("device1_addr"),"endpoint":"http://{}:8001".format(DEVICES_IP)},
			{'device_name':"Drone2","account":os.getenv("device2_addr"),"endpoint":"http://{}:8002".format(DEVICES_IP)},
			{'device_name':"Drone3","account":os.getenv("device3_addr"),"endpoint":"http://{}:8003".format(DEVICES_IP)},
			{'device_name':"Drone4","account":os.getenv("device4_addr"),"endpoint":"http://{}:8004".format(DEVICES_IP)},
			{'device_name':"Drone5","account":os.getenv("device5_addr"),"endpoint":"http://{}:8005".format(DEVICES_IP)},
			{'device_name':"Drone6","account":os.getenv("device6_addr"),"endpoint":"http://{}:8006".format(DEVICES_IP)}
		]
	},

	{
		"DAO_NAME": "DAO 2",
		"DAO_DESC": "A second dao",
		"MIN_DELAY": 0,
		"QUORUM_PERCENTAGE": 4,
		"VOTING_PERIOD": 9,
		"VOTING_DELAY": 0,
		"DEVICES":[]
	},
	{
		"DAO_NAME": "DAO 3",
		"DAO_DESC": "A third dao",
		"MIN_DELAY": 0,
		"QUORUM_PERCENTAGE": 4,
		"VOTING_PERIOD": 9,
		"VOTING_DELAY": 0,
		"DEVICES":[]
	}

]
	


for dao in Daos_to_create:
	deploy_dao(deployer_account,deployer_key,dao)





