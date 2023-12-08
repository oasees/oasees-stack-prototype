import requests
from dotenv import load_dotenv
import os

env_file_path = '../.env'
load_dotenv(dotenv_path=env_file_path)


IPFS_HOST = os.getenv("IPFS_HOST")
BLOCK_CHAIN_IP = os.getenv("BLOCK_CHAIN_IP")
DAO_HASH="QmaGFBHKkaf5bpYPFd8eASqDB4kFzGSqEPrEkNwKqpkJpu"

env_file_path = '../.devices_env'
load_dotenv(dotenv_path=env_file_path)
DEVICES_IP = os.getenv("DEVICES_IP")


print(DEVICES_IP)


devices = [
	{
		"device_endpoint":"http://{}:{}".format(DEVICES_IP,8001),
		"config_data":{
	    	"account": os.getenv("device1_addr"),
	    	"secret_key": os.getenv("device1_key"),
	    	"device_name": "device1",
			"IPFS_HOST": IPFS_HOST,
			"BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
	    }	
	},
	{
		"device_endpoint":"http://{}:{}".format(DEVICES_IP,8002),
		"config_data":{
	    	"account": os.getenv("device2_addr"),
	    	"secret_key": os.getenv("device2_key"),
	    	"device_name": "device2",
			"IPFS_HOST": IPFS_HOST,
			"BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
	    }	
	},
	{
		"device_endpoint":"http://{}:{}".format(DEVICES_IP,8003),
		"config_data":{
	    	"account": os.getenv("device3_addr"),
	    	"secret_key": os.getenv("device3_key"),
	    	"device_name": "device3",
			"IPFS_HOST": IPFS_HOST,
			"BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
	    }	
	},
	{
		"device_endpoint":"http://{}:{}".format(DEVICES_IP,8004),
		"config_data":{
	    	"account": os.getenv("device4_addr"),
	    	"secret_key": os.getenv("device4_key"),
	    	"device_name": "device4",
			"IPFS_HOST": IPFS_HOST,
			"BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
	    }	
	},

]


for dev in devices:

	response = requests.post("{}/agent_config".format(dev["device_endpoint"]), json=dev['config_data'])

	print(response.json())

	response = requests.post("{}/dao_subscription".format(dev["device_endpoint"]), json={"dao_hash":DAO_HASH})
	print(response.json())
