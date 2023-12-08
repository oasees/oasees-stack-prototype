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

###Any device can perform a proposal monitor
dev = devices['device1']


####Chose the state of the proposal to be monitored


#state='Active'
state='Defeated'
#state='Succeeded'


data = {
	"state":state
}


response = requests.post("{}/monitor_proposals".format(dev), json=data)

data=response.json()



print("Monitoring {} Proposals".format(state))
print("--------------------------------------------------------------------")
for r in data['resp']:
    print("Proposal Description:          ")
    print(' {}'.format(r['proposal_desc']))
    print("Vote Distribution:              ")
    print(' For: {} / Against: {} / Abstain {}'.format(r['votes_distribution'][1],r['votes_distribution'][0],r['votes_distribution'][2]))
    print("Reasons:                        ")
    for vote_detail in r['vote_details']:
        print("* {} / {}".format(vote_detail["reason"],vote_detail["support"]))

    print("--------------------------------------------------------------------")
