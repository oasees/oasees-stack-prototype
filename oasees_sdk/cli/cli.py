import subprocess
import time
import click
import getpass
import json
import ipfshttpclient
import requests
import web3
import socket
import os
from dotenv import load_dotenv
import yaml
from kubernetes import client,config

ipfs_manifest_str = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: ipfs-kubo-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ipfs-kubo
  template:
    metadata:
      labels:
        app: ipfs-kubo
    spec:
      containers:
      - name: ipfs-kubo
        image: ipfs/kubo:latest
        ports:
        - containerPort: 4001
        - containerPort: 8080
        - containerPort: 5001
      nodeSelector:
        node-role.kubernetes.io/master: "true"
---
apiVersion: v1
kind: Service
metadata:
  name: ipfs-kubo-service
spec:
  selector:
    app: ipfs-kubo
  type: NodePort
  ports:
    - name: main-tcp
      port: 4001
      targetPort: 4001
      protocol: TCP
      nodePort: 31001
    - name: main-udp
      port: 4001
      targetPort: 4001
      protocol: UDP
      nodePort: 31002
    - name: gateway
      port: 8080
      targetPort: 8080
      protocol: TCP
      nodePort: 31003
    - name: api
      port: 5002
      targetPort: 5001
      protocol: TCP
      nodePort: 31005
"""

SDK_PATH = "/home/" + getpass.getuser() + "/.oasees_sdk"

@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx):
    if not ctx.invoked_subcommand:
        bash_script = r'''
        Y='\x1b[38;2;252;220;132m'
        G='\x1b[38;2;60;148;140m'
        O='\x1b[38;2;244;172;92m'
        N='\033[0m' # No Color
        B='\x1b[38;2;4;188;252m'

        echo -e "                ${Y}.......           ${O}=======${N}                "             
        echo -e "               ${Y}.........        ${O}==========${N}               "            
        echo -e "               ${Y}.......... ${O}================${N}               "             
        echo -e "               ${Y}.........${O}==================${N}               "             
        echo -e "                ${Y}....... ${O}========= ======${N}                 "               
        echo -e "             ${Y}.......     ${O}=======     ${Y}.......${N}             "           
        echo -e "     ${O}=====  ${Y}.........${O}=========${Y}...............  .....${N}     "
        echo -e "   ${O}=========${Y}.........${O}======   ${Y}........................${N}   "
        echo -e "   ${O}==========${Y}.......  ${O}===== ${Y}........ .................   "
        echo -e "   ${O}==========  ${Y}...  ${O}====   ${Y}....  ${O}==== ===   ${Y}..........   "
        echo -e "   ${O} ========  ${Y}......${O}====  ${B}${G}**${B}  ${G}**${N} ${O}=========   ${Y}........    "
        echo -e "   ${O}   ======= ${Y}......     ${B}${G}**${B}****${G}**${N}    ${O}===== =====${Y}...      "   
        echo -e "   ${O}    ======== ${Y}.. ..  ${G}**${B}*******${G}**${N}   ${Y}..${O}== ========       "    
        echo -e "   ${O}    ========   ${Y}....${G}**${B}*********${G}**${Y}..... ${O}=========       "    
        echo -e "   ${O}    ============${Y}..  ${G}**${B}*******${G}**${N}   ${Y}.....${O}========       "    
        echo -e "   ${O}   ${Y}...${O}==== ======     ${G}**${B}****${G}**${O}====${Y}......${O}=========${N}     "  
        echo -e "   ${Y}.........  ${O}========== ${G} **  ** ${N} ${O}====${Y}......  ${O}=========   "
        echo -e "   ${Y}..........   .${O}=   ===  ${Y}....  ${O}====   ${Y}...  ${O}==========   "
        echo -e "   ${Y}................. ......... ${O}======${Y}........${O}=========   "
        echo -e "   ${Y}........................    ${O}=====${Y}.........${O}========    "
        echo -e "     ${Y}.....  ..............${O}========   ${Y}........${O}   ===      "   
        echo -e "             ${Y}.......     ${O}=========    ${Y}......             "
        echo -e "                   ${O}===============${Y}.......                "
        echo -e "                  ${O}===============${Y}.........               "
        echo -e "                 ${O}==========     ${Y}..........               " 
        echo -e "                 ${O}==========      ${Y}.........               "
        echo -e "                  ${O}========        ${Y}.......                "
                                                
        echo -e ${B}"  ___    _    ____  _____ _____ ____    ____  ____  _  __ "
        echo -e ${B}" / _ \  / \  / ___|| ____| ____/ ___|  / ___||  _ \| |/ / "
        echo -e ${B}"| | | |/ _ \ \___ \|  _| |  _| \___ \  \___ \| | | | ' /  "
        echo -e ${B}"| |_| / ___ \ ___) | |___| |___ ___) |  ___) | |_| | . \  "
        echo -e ${B}" \___/_/   \_\____/|_____|_____|____/  |____/|____/|_|\_\ "${N}
        '''

        # Execute the Bash script and capture its output
        result = subprocess.run(['bash', '-c', bash_script], capture_output=True, text=True)
        click.echo(result.stdout)
        cli(['--help'])

@cli.command()
def init_cluster():
    '''Creates a new kubernetes cluster with the current machine as its master, and registers it to the blockchain.'''
    config_setup()
    try:
        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'r') as f:
            config = json.load(f)

        w3 = web3.Web3(web3.HTTPProvider("http://{}:8545".format(config['BLOCKCHAIN_IP'])))
        from web3.middleware import geth_poa_middleware
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)

        response = requests.get('http://{}:6001/ipfs_portal_contracts'.format(config['PROVIDER_IP']))
        response = response.json()
        portal_contracts = response["portal_contracts"]

        marketplace_address = portal_contracts["marketplace_address"]
        marketplace_abi = portal_contracts["marketplace_abi"]

        nft_address = portal_contracts["nft_address"]
        nft_abi = portal_contracts["nft_abi"]

        nft_contract = w3.eth.contract(address=nft_address, abi=nft_abi)
        marketplace_contract = w3.eth.contract(address=marketplace_address, abi=marketplace_abi)

        deployer_account = w3.to_checksum_address(config['ACCOUNT'])
        deployer_key = config['KEY']

        mkdir_1 = subprocess.run(['sudo','mkdir','/etc/rancher'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        mkdir_2 = subprocess.run(['sudo','mkdir','/etc/rancher/k3s'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        echo = subprocess.run(['sudo','sh', '-c','echo "mirrors:\n  docker.io:\n  registry.k8s.io:" > /etc/rancher/k3s/registries.yaml'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        curl = subprocess.Popen(['curl','-sfL', 'https://get.k3s.io'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        result = subprocess.check_output(['sh','-s','-','--write-kubeconfig-mode','644', '--write-kubeconfig', '/home/'+getpass.getuser()+'/.kube/config','--embedded-registry'], stdin=curl.stdout)
        click.echo(result)
        curl.wait()


        time.sleep(3)

        with open('/home/'+getpass.getuser()+'/.kube/config', 'r') as f:
            cluster_config = yaml.safe_load(f)

        result = subprocess.run(['kubectl','get','nodes','-o','custom-columns=IP:.status.addresses[].address','--no-headers'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        ip = result.stdout.strip().split('\n')

        click.echo(ip[0])
        cluster_config['clusters'][0]['cluster']['server'] = "https://{}:6443".format(ip[0])

        echo = subprocess.Popen(['echo', ipfs_manifest_str], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        result = subprocess.check_output(['kubectl','apply','-f','-'], stdin=echo.stdout)
        click.echo(result)
        echo.wait()

        

        client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(config['IPFS_IP']))
        cluster_config_hash = client.add_json(cluster_config)
        click.echo(cluster_config_hash)


        transaction = nft_contract.functions.mint(cluster_config_hash).build_transaction({
		'chainId': 31337,
		'gas': 2000000,
		'gasPrice': w3.eth.gas_price,
		'nonce': w3.eth.get_transaction_count(deployer_account) + 0
	    })

        signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=deployer_key)
        transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
        txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
        tx_json = json.loads(w3.to_json(txn_receipt))

        token_id=int(tx_json['logs'][2]['data'],16)




        dao_args = {
            "DAO_NAME": socket.gethostname(),
            "DAO_DESC": "A Cluster created with Oasees SDK.",
            "MIN_DELAY":0,
            "VOTING_PERIOD":10,
	        "VOTING_DELAY":0,
            "QUORUM_PERCENTAGE":50,
            "dao_app_name":"flask1"
        }


        ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' 

        DAO_NAME = dao_args['DAO_NAME']
        DAO_DESC = dao_args['DAO_DESC']

        dao_info = {
            "dao_name": DAO_NAME,
            "dao_desc": DAO_DESC,
            "dao_app_name":"flask1"
        }


        dao_info_hash = client.add_json(dao_info)
        client.close()
        

        transaction = marketplace_contract.functions.makeDao(nft_address,0,dao_info_hash,token_id,True).build_transaction({
		'value':0,
		'chainId': 31337, 
		'gas': 2000000,  
		'gasPrice': w3.eth.gas_price,  
		'nonce': w3.eth.get_transaction_count(deployer_account)
	    })


        signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=deployer_key)
        transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
        txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)

        results = marketplace_contract.caller({'from': deployer_account}).getJoinedDaos()
        for dao in results:
            if (dao[6]):
                update_cluster_id(dao[4])
                break

        click.echo("Cluster successfully deployed.")

    except FileNotFoundError:
        click.echo("Error: K3s cluster could not be deployed.")



@cli.command()
def get_token():
    '''Retrieves the token required to join the cluster.'''
    try:
        token = subprocess.run(['sudo', 'cat','/var/lib/rancher/k3s/server/token'],  stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        click.echo(token.stdout)
    except FileNotFoundError:
        click.echo("Error: No token found.")


@cli.command()
@click.argument('role', type=str)
def uninstall(role):
    '''Runs the appropriate k3s uninstallation script based on the role provided.'''
    try:
        if(role=='master'):
            result = subprocess.run(['/usr/local/bin/k3s-uninstall.sh'],  stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            click.echo("Cluster uninstalled successfully.")
            try:
                reset_config()
                click.echo("Config reset.")
            except FileNotFoundError:
                click.echo("Error: Config file not found.")
        elif (role=='agent'):
            result = subprocess.run(['/usr/local/bin/k3s-agent-uninstall.sh'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            click.echo("Agent uninstalled successfully.")
        else:
            click.echo("Enter a valid role (master / agent)")
    except FileNotFoundError:
        click.echo("Error: Uninstall executable not found.")

@cli.command()
@click.option('--ip', required=True, help="The cluster's master ip address.")
@click.option('--token', required=True, help="The cluster's master token.")
def join_cluster(ip,token):
    '''Joins the current machine to the specified cluster.'''
    try:
        mkdir_1 = subprocess.run(['sudo','mkdir','/etc/rancher'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        mkdir_2 = subprocess.run(['sudo','mkdir','/etc/rancher/k3s'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        echo = subprocess.run(['sudo','sh', '-c','echo "mirrors:\n  docker.io:\n  registry.k8s.io:" > /etc/rancher/k3s/registries.yaml'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        curl = subprocess.Popen(['curl','-sfL', 'https://get.k3s.io'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        result = subprocess.check_output(['sh','-'], env={'K3S_URL' : 'https://'+ip+':6443', 'K3S_TOKEN': token}, stdin=curl.stdout)
        click.echo(result)
        curl.wait()
    except FileNotFoundError:
        click.echo("Error: K3S cluster could not be joined.\n")
            

@cli.command()
def get_config():
    '''Prints out the SDK's current configuration file.'''
    try:
        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', "r") as f:
            config = json.load(f)
            click.echo(config)
    except FileNotFoundError:
        click.echo("Error: Config file doesn't exist in the cli program's directory.")

@cli.command()
def get_nodes():
    '''Retrieves information on the cluster's nodes.'''
    try:
        result = subprocess.run(['kubectl', 'get','nodes'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        click.echo(result.stdout)
    except FileNotFoundError:
        click.echo("Error: No connection to cluster found.")

@cli.command()
def register_new_nodes():
    '''Looks up the latest nodes that have joined the cluster and registers them to the blockchain.'''
    config_setup()
    try:
        result = subprocess.run(['kubectl','get','nodes','-l','!node-role.kubernetes.io/master','-o','custom-columns=NAME:.metadata.name','--no-headers'],  stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        node_names = result.stdout.strip().split('\n')

        result = subprocess.run(['kubectl','get','nodes','-l','!node-role.kubernetes.io/master','-o','custom-columns=IP:.status.addresses[].address','--no-headers'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        node_ips = result.stdout.strip().split('\n')
        
        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'r') as f:
            config = json.load(f)

        w3 = web3.Web3(web3.HTTPProvider("http://{}:8545".format(config['BLOCKCHAIN_IP'])))
        from web3.middleware import geth_poa_middleware
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)


        response = requests.get('http://{}:6001/ipfs_portal_contracts'.format(config['PROVIDER_IP']))
        response = response.json()
        portal_contracts = response["portal_contracts"]

        marketplace_address = portal_contracts["marketplace_address"]
        marketplace_abi = portal_contracts["marketplace_abi"]
        marketplace_contract = w3.eth.contract(address=marketplace_address, abi=marketplace_abi)

        nft_address = portal_contracts["nft_address"]
        nft_abi = portal_contracts["nft_abi"]
        nft_contract = w3.eth.contract(address=nft_address, abi=nft_abi)

        deployer_account = w3.to_checksum_address(config['ACCOUNT'])
        deployer_key = config['KEY']

        new_nodes_names = []
        new_nodes_ips = []
        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json','r') as f:
            config = json.load(f)
        
        agents = config['agents']
        for i in range(len(node_names)):
            if(node_names[i] not in agents.keys()):
                new_nodes_names.append(node_names[i])
                new_nodes_ips.append(node_ips[i])

        for i in range(len(new_nodes_names)):
            new_acc = w3.eth.account.create()
            new_acc_address = new_acc.address
            new_acc_pkey = w3.to_hex(new_acc.key)
            agents[new_nodes_names[i]] = [new_acc.address, w3.to_hex(new_acc.key)]

            device_name = new_nodes_names[i]
            device_content = {
                "account": new_acc.address,
                "name": device_name,
                "device_endpoint": "http://"+new_nodes_ips[i]+":8001"
            }

            metadata = {
                "price": 0,
                "title":device_name,
                "description": "A description for {}".format(device_name)
            }

            metadata = json.dumps(metadata)

            client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(config['IPFS_IP']))
            meta_hash = client.add_json(metadata)
            content_hash = client.add_json(device_content)
            client.close()


            market_fee = marketplace_contract.functions.LISTING_FEE().call()

            transaction = nft_contract.functions.mint(content_hash).build_transaction({
                'chainId': 31337,
                'gas': 2000000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(config['ACCOUNT'])
            })


            signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=config['KEY'])
            transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
            txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
            tx_json = json.loads(w3.to_json(txn_receipt))

            token_id=int(tx_json['logs'][2]['data'],16)

            transaction = marketplace_contract.functions.makeDevice(nft_address,token_id,w3.to_wei(0, 'ether'),meta_hash,False).build_transaction({
                'value':market_fee,
                'chainId': 31337,
                'gas': 2000000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(config['ACCOUNT'])
            })


            signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=config['KEY'])
            transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
            txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)


            transaction = {
                'to': new_acc_address,
                'from': config['ACCOUNT'],
                'value': w3.to_wei(1,'ether'),
                'gas': 21000,  # Standard gas limit for a simple transfer
                'gasPrice': w3.to_wei('1', 'gwei'),  # Gas price in Wei
                'nonce': w3.eth.get_transaction_count(config['ACCOUNT']),
                'chainId': 31337  # Default chain ID for Hardhat
            }
            private_key = config['KEY']  # Replace with the private key of the sender
            signed_transaction = w3.eth.account.sign_transaction(transaction, private_key)

            # Send the transaction
            tx_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
            # Wait for the transaction to be mined
            tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            #print(f"Transaction receipt: {tx_receipt}")

            deploy_agent(new_nodes_names[i],new_acc_address,new_acc_pkey)

            if(config['DAO_TOKEN_ID']!=-1):
                dao_content_hash = nft_contract.functions.tokenURI(config['DAO_TOKEN_ID']).call()
                client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(config['IPFS_IP']))
                dao_content = client.cat(dao_content_hash)
                dao_content = dao_content.decode("UTF-8")
                dao_content = json.loads(dao_content)

                token_contract = w3.eth.contract(address=dao_content['token_address'], abi=dao_content['token_abi'])


                transaction = token_contract.functions.transfer(new_acc_address,20).build_transaction({
                    'from':config['ACCOUNT'],
                    'value':0,
                    'chainId': 31337, 
                    'gas': 2000000,  
                    'gasPrice': w3.eth.gas_price,  
                    'nonce': w3.eth.get_transaction_count(deployer_account)
                })

                signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=deployer_key)
                transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
                txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)

                transaction = marketplace_contract.functions.registerDeviceToDao(new_acc.address,config['OASEES_CLUSTER_ID']).build_transaction({
                    'value':0,
                    'chainId': 31337, 
                    'gas': 2000000,  
                    'gasPrice': w3.eth.gas_price,  
                    'nonce': w3.eth.get_transaction_count(deployer_account)
                 })

                signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=deployer_key)
                transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
                txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
            else :
                transaction = marketplace_contract.functions.registerDeviceToCluster(new_acc.address,config['OASEES_CLUSTER_ID']).build_transaction({
                    'value':0,
                    'chainId': 31337, 
                    'gas': 2000000,  
                    'gasPrice': w3.eth.gas_price,  
                    'nonce': w3.eth.get_transaction_count(deployer_account)
                 })

                signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=deployer_key)
                transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
                txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)


        
        config['agents'] = agents

        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'w') as f:
            json.dump(config, f)

        if(len(new_nodes_names)>0):
            click.echo("Registered the latest node(s) on the blockchain.")
        else:
            click.echo("All nodes have already been registered.")

    except FileNotFoundError:
        click.echo("Error: Process could not be completed.")


@cli.command()
@click.argument('dao_content_hash', type=str)
def apply_dao_logic(dao_content_hash):
    with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'r') as f:
        config = json.load(f)

    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(config['IPFS_IP']))
    dao_content = client.cat(dao_content_hash)
    dao_content = dao_content.decode("UTF-8")
    dao_content = json.loads(dao_content)


    w3 = web3.Web3(web3.HTTPProvider("http://{}:8545".format(config['BLOCKCHAIN_IP'])))
    from web3.middleware import geth_poa_middleware
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    token_provider_contract = w3.eth.contract(address=dao_content['token_provider_address'], abi=dao_content['token_provider_abi'])
    token_contract = w3.eth.contract(address=dao_content['token_address'], abi=dao_content['token_abi'])

    deployer_account = web3.Web3.to_checksum_address(config['ACCOUNT'])
    deployer_key = config['KEY']



    response = requests.get('http://{}:6001/ipfs_portal_contracts'.format(config['PROVIDER_IP']))
    response = response.json()
    portal_contracts = response["portal_contracts"]

    marketplace_address = portal_contracts["marketplace_address"]
    marketplace_abi = portal_contracts["marketplace_abi"]
    marketplace_contract = w3.eth.contract(address=marketplace_address, abi=marketplace_abi)

    nft_address = portal_contracts["nft_address"]
    nft_abi = portal_contracts["nft_abi"]

    nft_contract = w3.eth.contract(address=nft_address, abi=nft_abi)


    transaction = nft_contract.functions.mint(dao_content_hash).build_transaction({
		'chainId': 31337,
		'gas': 2000000,
		'gasPrice': w3.eth.gas_price,
		'nonce': w3.eth.get_transaction_count(deployer_account)
	    })

    signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=deployer_key)
    transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
    txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
    tx_json = json.loads(w3.to_json(txn_receipt))

    token_id=int(tx_json['logs'][2]['data'],16)

    transaction = marketplace_contract.functions.applyDao(config['OASEES_CLUSTER_ID'],token_id).build_transaction({
        'from':config['ACCOUNT'],
        'value':0,
        'chainId': 31337, 
        'gas': 2000000,  
        'gasPrice': w3.eth.gas_price,  
        'nonce': w3.eth.get_transaction_count(config['ACCOUNT'])
    })

    signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=config['KEY'])
    transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
    txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)
    

    


    tx = token_provider_contract.functions.getTokens().build_transaction({
        "gasPrice": w3.eth.gas_price,
        "chainId": 31337,
        "from": deployer_account,
        "nonce": w3.eth.get_transaction_count(deployer_account)
    })

    signed_tx = w3.eth.account.sign_transaction(tx, private_key=deployer_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    txn_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    tx = token_contract.functions.delegate(config['ACCOUNT']).build_transaction({
        "gasPrice": w3.eth.gas_price,
        "chainId": 31337,
        "from": deployer_account,
        "nonce": w3.eth.get_transaction_count(deployer_account)
    })

    signed_tx = w3.eth.account.sign_transaction(tx, private_key=deployer_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    txn_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)


    for entry in config['agents']:
        agent = config['agents'][entry]

        transaction = token_contract.functions.transfer(agent[0],20).build_transaction({
            'from':config['ACCOUNT'],
            'value':0,
            'chainId': 31337, 
            'gas': 2000000,  
            'gasPrice': w3.eth.gas_price,  
            'nonce': w3.eth.get_transaction_count(deployer_account)
        })

        signed_transaction = w3.eth.account.sign_transaction(transaction, private_key=deployer_key)
        transaction_hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)
        txn_receipt = w3.eth.wait_for_transaction_receipt(transaction_hash)

    config['DAO_TOKEN_ID'] = token_id
    with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json','w') as f:
        json.dump(config,f)



def deploy_agent(node_name,account,pkey):
    config.load_kube_config()


    # Create an API client for the AppsV1Api
    api_instance = client.AppsV1Api()

    with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'r') as f:
        sdk_config = json.load(f)

    
    # Define the container
    env_vars = [
        client.V1EnvVar(name="MARKETPLACE_ADDRESS", value="0x5FbDB2315678afecb367f032d93F642f64180aa3"),
        client.V1EnvVar(name="NFT_ADDRESS", value="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"),
        client.V1EnvVar(name="IPFS_HOST", value=sdk_config['IPFS_IP']),
        client.V1EnvVar(name="BLOCK_CHAIN_IP", value=sdk_config['BLOCKCHAIN_IP']),
        client.V1EnvVar(name="ACCOUNT", value=account),
        client.V1EnvVar(name="SECRET_KEY", value=pkey),
        client.V1EnvVar(name="DEVICE_NAME", value=node_name)
    ]

    # Define the container
    container = client.V1Container(
        name="blockchain-agent",
        image="andreasoikonomakis/oasees-blockchain-agent",
        ports=[client.V1ContainerPort(container_port=5000)],
        env=env_vars
    )

    # Define the pod template
    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels={"app": "blockchain-agent"}),
        spec=client.V1PodSpec(
            containers=[container],
            node_name=node_name
        )
    )

    # Define the deployment spec
    spec = client.V1DeploymentSpec(
        replicas=1,
        selector=client.V1LabelSelector(
            match_labels={"app": "blockchain-agent"}
        ),
        template=template
    )

    # Define the deployment
    deployment = client.V1Deployment(
        api_version="apps/v1",
        kind="Deployment",
        metadata=client.V1ObjectMeta(name="blockchain-agent-" + node_name),
        spec=spec
    )

    # Create the deployment
    api_response = api_instance.create_namespaced_deployment(
        body=deployment,
        namespace="default"
    )
    print(f"Deployment created. Status='{api_response.status}'")



    api_instance = client.CoreV1Api()

    service_spec = client.V1ServiceSpec(
        type="ClusterIP",
        ports=[client.V1ServicePort(port=80, target_port=5000)],
        selector={"app": "blockchain-agent"}
    )

    # Define the service
    service = client.V1Service(
        api_version="v1",
        kind="Service",
        metadata=client.V1ObjectMeta(name="blockchain-agent-" + node_name),
        spec=service_spec
    )

    # Create the service
    api_response = api_instance.create_namespaced_service(
        body=service,
        namespace="default"
    )




def reset_config():
    with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'r') as f:
        config = json.load(f)
    
    config['OASEES_CLUSTER_ID'] = -1
    config['agents'] = {}
    config['DAO_TOKEN_ID'] = -1

    with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'w') as f:
        json.dump(config,f)

@cli.command()
def config_full_reset():
    config = {}
    with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'w') as f:
        json.dump(config,f)


def update_cluster_id(id):
    try:
        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'r') as f:
            config = json.load(f)
        
        config['OASEES_CLUSTER_ID'] = id

        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'w') as f:
            json.dump(config,f)
    except FileNotFoundError:
        click.echo("Error: Config file doesn't exist in the cli program's directory.")


def config_exists():
    if not os.path.isdir(SDK_PATH):
        os.makedirs(SDK_PATH)

    default_config = {'BLOCKCHAIN_IP':'', 'PROVIDER_IP':'', 'IPFS_IP':'', 'ACCOUNT': '', 'KEY':'', 'OASEES_CLUSTER_ID': -1, 'agents':{}, "DAO_TOKEN_ID":-1}
    try:
        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json','r') as f:
            config = json.load(f)
            
        for key in default_config.keys():
            if key not in config.keys():
                with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'w') as f:
                    json.dump(default_config,f)
                break

    except FileNotFoundError:
        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'w') as f:
            config = default_config
            json.dump(config,f)


def config_setup():
    try:
        with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'r') as f:
            config = json.load(f)

        changed = False

        if (not config['BLOCKCHAIN_IP'] or not config['PROVIDER_IP'] or not config['IPFS_IP']):
            host_ip = input("Provide the ip of the host that the OASEES stack is running on: ")
            config['BLOCKCHAIN_IP'] = host_ip
            config['PROVIDER_IP'] = host_ip
            config['IPFS_IP'] = host_ip
            changed = True
        
        if (not config['ACCOUNT'] or not config['KEY']):
            account = input("Provide your account's blockchain address: ")
            key = input("Provide your blockchain account's private key: ")
            config['ACCOUNT'] = account
            config['KEY'] = key
            changed = True

        if(changed):
            with open('/home/'+getpass.getuser()+'/.oasees_sdk/config.json', 'w') as f:
                json.dump(config,f)

    except FileNotFoundError:
        click.echo("Error: config file not found.")
    





# @cli.command()
# def new_cluster():
#     mkdir_1 = subprocess.run(['sudo','mkdir','/etc/rancher'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
#     mkdir_2 = subprocess.run(['sudo','mkdir','/etc/rancher/k3s'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
#     echo = subprocess.run(['sudo','sh', '-c','echo "mirrors:\n  docker.io:\n  registry.k8s.io:" > /etc/rancher/k3s/registries.yaml'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
#     curl = subprocess.Popen(['curl','-sfL', 'https://get.k3s.io'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
#     result = subprocess.check_output(['sh','-s','-','--write-kubeconfig-mode','644', '--write-kubeconfig', '/home/'+getpass.getuser()+'/.kube/config','--embedded-registry'], stdin=curl.stdout)
#     click.echo(result)
#     curl.wait()

#     echo = subprocess.Popen(['echo', ipfs_manifest_str], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
#     result = subprocess.check_output(['kubectl','apply','-f','-'], stdin=echo.stdout)
#     click.echo(result)
#     echo.wait()


config_exists()