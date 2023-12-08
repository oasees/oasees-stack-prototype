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
- Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
- Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

**Make sure that you use a different account to login to the portal!!**


## More detailed instructions and demos will follow


