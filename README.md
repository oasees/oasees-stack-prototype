# oasees-stack-prototype
## Requirements
This current version of the Oasees stack requires the following:
- Docker version 24.0.5
- Docker Compose version v2.3.3
- Metamask browser extension

## Installation
```sh
cd oasses-stack-prototype
nano .env (change every ip to your host's ip)
nano .env_devices (change ip to your host's ip)
docker compose up -d --build
```
The initial building procedure can take a while depending your hardware
## Check Installation
After the building procedure finishes, the following containers must be up and running:
- ipfs
- oasees_portal
- flask_notebooks_api
- hardhat
You can check by typing:
```sh
docker ps -a --format "{{.Names}}"
```
If everything is up and running, open your browser and type:

**http://{YOUR_HOST_IP}:3000**

Choose an account from hardhat_accounts.txt

**NOTE** : For the demo devices 4 accounts have been chosen:

 - Account#14
 - Account#16
 - Account#17
 - Account#18

Also Do **NOT** use this account since it is used by backend functionalities
for deploying contracts , etc:
- Account #0: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
- Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

**Make sure that you use a different account to login to the portal!!**

## Deploy Sample DAOs
Some python modules are required to be installed locally
```sh
pip3 install -r requirements.txt
cd deploy_dao
python3 create_daos.py
```
After the execution an IPFS hash will be produced.

## Create demo devices to be part of the created DAO
The devices are docker containers that run a first verion of the oasees agent.
```sh
cd demo_devices
edit configure_devices.py // Change variable DAO_HASH with the produced IPS hash 
docker compose up --build -d
python3 configure_devices.py

```

## More detailed instructions and demos will follow
