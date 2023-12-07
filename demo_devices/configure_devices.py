import requests


DEVICES_IP="10.150.0.151"
DAO_HASH="QmTKoyRTHpFi52YGt2cRNK5KY2NCtpeACbH3pV7tZrQLSt"


devices = [
	{
		"device_endpoint":"http://{}:{}".format(DEVICES_IP,8001),
		"config_data":{
	    	"account": "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
	    	"secret_key": "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
	    	"device_name": "device1"
	    }	
	},
	{
		"device_endpoint":"http://{}:{}".format(DEVICES_IP,8002),
		"config_data":{
	    	"account": "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
	    	"secret_key": "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
	    	"device_name": "device2"
	    }	
	},
	{
		"device_endpoint":"http://{}:{}".format(DEVICES_IP,8003),
		"config_data":{
	    	"account": "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
	    	"secret_key": "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
	    	"device_name": "device3"
	    }	
	},
	{
		"device_endpoint":"http://{}:{}".format(DEVICES_IP,8004),
		"config_data":{
	    	"account": "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
	    	"secret_key": "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
	    	"device_name": "device4"
	    }	
	},

]


for dev in devices:

	response = requests.post("{}/agent_config".format(dev["device_endpoint"]), json=dev['config_data'])

	print(response.json())

	response = requests.post("{}/dao_subscription".format(dev["device_endpoint"]), json={"dao_hash":DAO_HASH})
	print(response.json())
