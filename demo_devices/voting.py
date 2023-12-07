import requests

DEVICES_IP="10.150.0.151"

device_endpoint="http://{}:{}".format(DEVICES_IP,5000)


data = {
	"vote":1,
	"reason": "Some reason"
	}

response = requests.post("{}/vote".format(device_endpoint), json=data)

print(response.json())