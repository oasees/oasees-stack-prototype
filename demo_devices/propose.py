import requests


DEVICES_IP="10.150.0.151"

device_endpoint="http://{}:{}".format(DEVICES_IP,8001)


data = {
	"proposal_description":"This is a proposal",
	"proposed_value":67
}
response = requests.post("{}/create_proposal".format(device_endpoint), json=data)

print(response.json())