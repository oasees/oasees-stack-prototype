import requests


DEVICE_IP="10.150.0.151"
IPFS_HOST="10.150.0.151"
DEVICE_NAME="DEVICE_1"
BLOCK_CHAIN_IP="10.150.0.151"



config_data = {
    "account": "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
    "secret_key": "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
    "device_name": DEVICE_NAME,
    "IPFS_HOST": IPFS_HOST,
    "BLOCK_CHAIN_IP": BLOCK_CHAIN_IP 
}	



device_endpoint="http://{}:{}".format(DEVICE_IP,5000)

response = requests.post("{}/agent_config".format(device_endpoint), json=config_data)