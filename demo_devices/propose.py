import requests
from dotenv import load_dotenv
import os

env_file_path = '../.devices_env'
load_dotenv(dotenv_path=env_file_path)

DEVICES_IP = os.getenv("DEVICES_IP")

devices = {
    "device1" : "http://{}:{}".format(DEVICES_IP,8001),
    "device2" : "http://{}:{}".format(DEVICES_IP,8002),
    "device3" : "http://{}:{}".format(DEVICES_IP,8003),
    "device4" : "http://{}:{}".format(DEVICES_IP,8004),
}


#Define which device will perform the proposal
dev = devices['device1']


#----NOTE: The poposal must differ either in value or message. If it is exactly the same , the call will fail


#Define the message of the proposal
proposal_desc = "This is a proposal 7"

#Define the value of the resource to be changed (Box smart contract for this proof of concept DAO)
proposed_value = 67


data = {
	"proposal_description":proposal_desc,
	"proposed_value":proposed_value
}


response = requests.post("{}/create_proposal".format(dev), json=data)

print(response.json())
