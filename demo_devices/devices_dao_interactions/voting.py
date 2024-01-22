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




#Define which device will perform the vote
#----NOTE: if this specific device has already cast its vote for the current proposal , the vote call will fail

dev = devices['device1']
#1 is in favor
#0 is against

vote=1
reason="Some reason"


data = {
	"vote":vote,
	"reason": reason
	}

response = requests.post("{}/vote".format(dev), json=data)

print(response.json())