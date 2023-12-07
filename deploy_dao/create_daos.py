import web3
import json
import sys
import ipfshttpclient
import requests
from deploy_dao_template import deploy_dao

IPFS_HOST = "10.150.0.151"
BLOCK_CHAIN_IP = "10.150.0.151"
INFRA_HOST = "10.150.0.151"


DEVICES_IP= "10.150.0.151"

deployer_account='0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
deployer_account = web3.Web3.toChecksumAddress(deployer_account)
deployer_key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'



Daos_to_create = [

	{
		"DAO_NAME": "DRONES DAO",
		"DAO_DESC": "A dao for drones",
		"MIN_DELAY": 0,
		"QUORUM_PERCENTAGE": 4,
		"VOTING_PERIOD": 9,
		"VOTING_DELAY": 0,
		"DEVICES":[
			{'device_name':"device1","account":"0x2546BcD3c84621e976D8185a91A922aE77ECEc30","endpoint":"http://{}:8001".format(DEVICES_IP)},
			{'device_name':"device2","account":"0xdD2FD4581271e230360230F9337D5c0430Bf44C0","endpoint":"http://{}:8002".format(DEVICES_IP)},
			{'device_name':"device3","account":"0xbDA5747bFD65F08deb54cb465eB87D40e51B197E","endpoint":"http://{}:8003".format(DEVICES_IP)},
			{'device_name':"device4","account":"0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199","endpoint":"http://{}:8004".format(DEVICES_IP)}
		]
	},

	# {
	# 	"DAO_NAME": "DAO 2",
	# 	"DAO_DESC": "A second dao",
	# 	"MIN_DELAY": 0,
	# 	"QUORUM_PERCENTAGE": 4,
	# 	"VOTING_PERIOD": 9,
	# 	"VOTING_DELAY": 0,
	# 	"DEVICES":[]
	# },
	# {
	# 	"DAO_NAME": "DAO 3",
	# 	"DAO_DESC": "A third dao",
	# 	"MIN_DELAY": 0,
	# 	"QUORUM_PERCENTAGE": 4,
	# 	"VOTING_PERIOD": 9,
	# 	"VOTING_DELAY": 0,
	# 	"DEVICES":[]
	# }

]
	


for dao in Daos_to_create:
	deploy_dao(deployer_account,deployer_key,dao)





