import requests
from dotenv import load_dotenv
import os

env_file_path = '../.devices_env'  # Replace this with the actual path to your .env file
load_dotenv(dotenv_path=env_file_path)

DEVICES_IP = os.getenv("DEVICES_IP")

devices = {
    "device1" : "http://{}:{}".format(DEVICES_IP,8001),
    "device2" : "http://{}:{}".format(DEVICES_IP,8002),
    "device3" : "http://{}:{}".format(DEVICES_IP,8003),
    "device4" : "http://{}:{}".format(DEVICES_IP,8004),
}



response = requests.post("{}/vote".format(devices["device1"]), json={'vote':0, 'reason': "A reason"})
response = requests.post("{}/vote".format(devices["device2"]), json={'vote':1, 'reason': "Another reason"})
response = requests.post("{}/vote".format(devices["device3"]), json={'vote':0, 'reason': "A reason"})
response = requests.post("{}/vote".format(devices["device4"]), json={'vote':1, 'reason': "A reason"})

print(response.json())
