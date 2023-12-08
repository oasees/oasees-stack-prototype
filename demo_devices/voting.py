import requests
from dotenv import load_dotenv
import os

env_file_path = '../.env'  # Replace this with the actual path to your .env file
load_dotenv(dotenv_path=env_file_path)

DEVICES_IP = os.getenv("DEVICES_IP")

devices = {
    "device1" : "http://{}:{}".format(DEVICES_IP,8001),
    "device2" : "http://{}:{}".format(DEVICES_IP,8002),
    "device3" : "http://{}:{}".format(DEVICES_IP,8003),
    "device4" : "http://{}:{}".format(DEVICES_IP,8004),
}

dev = devices['device1']

data = {
	"vote":1,
	"reason": "Some reason"
	}

response = requests.post("{}/vote".format(dev), json=data)

print(response.json())