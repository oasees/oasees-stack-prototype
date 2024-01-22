import requests
from dotenv import load_dotenv
import os

env_file_path = '../.devices_env'
load_dotenv(dotenv_path=env_file_path)
DEVICES_IP = os.getenv("DEVICES_IP")
IPFS_HOST = os.getenv("IPFS_HOST")
BLOCK_CHAIN_IP = os.getenv("BLOCK_CHAIN_IP")


devices = [
	{
		"device_endpoint":os.getenv("device1_endpoint"),
		"config_data":{
	    	"account": os.getenv("device1_addr"),
	    	"secret_key": os.getenv("device1_key"),
	    	"device_name": os.getenv("device1_name"),
			"IPFS_HOST": IPFS_HOST,
			"BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
	    }	
	},
	{
		"device_endpoint":os.getenv("device2_endpoint"),
		"config_data":{
	    	"account": os.getenv("device2_addr"),
	    	"secret_key": os.getenv("device2_key"),
	    	"device_name": os.getenv("device2_name"),
			"IPFS_HOST": IPFS_HOST,
			"BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
	    }	
	},
	{
		"device_endpoint":os.getenv("device3_endpoint"),
		"config_data":{
	    	"account": os.getenv("device3_addr"),
	    	"secret_key": os.getenv("device3_key"),
	    	"device_name": os.getenv("device3_name"),
			"IPFS_HOST": IPFS_HOST,
			"BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
	    }	
	},
	{
		"device_endpoint":os.getenv("device4_endpoint"),
		"config_data":{
	    	"account": os.getenv("device4_addr"),
	    	"secret_key": os.getenv("device4_key"),
	    	"device_name": os.getenv("device4_name"),
			"IPFS_HOST": IPFS_HOST,
			"BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
	    }	
	}

]


for dev in devices:

	response = requests.post("{}/agent_config".format(dev["device_endpoint"]), json=dev['config_data'])

	print(response.json())

