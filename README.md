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
- flask_brownie_api
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

**Metamask instructions will follow**
For now add a new network called oasees-net at **http://{YOUR_HOST_IP}:8545**

Connect to metamask by using the following account:
- Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
- Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

## More detailed instructions and demos will follow


