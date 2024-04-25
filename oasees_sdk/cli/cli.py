import subprocess
import click
import getpass
import json
import ipfshttpclient
import requests
import web3
import socket
import os
from dotenv import load_dotenv


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
        with open('/home/'+getpass.getuser()+'/config.json', 'r') as f:
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

        curl = subprocess.Popen(['curl','-sfL', 'https://get.k3s.io'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        result = subprocess.check_output(['sh','-s','-','--write-kubeconfig-mode','644', '--write-kubeconfig', '/home/'+getpass.getuser()+'/.kube/config'], stdin=curl.stdout)
        click.echo(result)
        curl.wait()
        # Print the output of the 'ls' command

        client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(config['IPFS_IP']))
        cluster_config_hash = client.add_json({"test": "test string"})

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

        dao_info = {
            "dao_name": socket.gethostname(),
            "dao_desc": "A Cluster created with Oasees SDK.",
            "dao_nft_address":nft_address,
            "dao_nft_abi":nft_abi,
	        "dao_nft_id":token_id
        }

        dao_info_hash = client.add_json(dao_info)
        client.close()

        transaction = marketplace_contract.functions.makeDao(nft_address,100,dao_info_hash,token_id,True).build_transaction({
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
        curl = subprocess.Popen(['curl','-sfL', 'https://get.k3s.io'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        result = subprocess.check_output(['sh','-'], env={'K3S_URL' : 'https://'+ip+':6443', 'K3S_TOKEN': token}, stdin=curl.stdout)
        click.echo(result)
        curl.wait()
    except FileNotFoundError:
        click.echo("Error: K3S cluster could not be joined.\n")
            

@cli.command()
def get_config():
    try:
        with open('/home/'+getpass.getuser()+'/config.json', "r") as f:
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
        
        with open('/home/'+getpass.getuser()+'/config.json', 'r') as f:
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
        with open('/home/'+getpass.getuser()+'/config.json','r') as f:
            config = json.load(f)
        
        agents = config['agents']
        for i in range(len(node_names)):
            if(node_names[i] not in agents.keys()):
                new_nodes_names.append(node_names[i])
                new_nodes_ips.append(node_ips[i])

        for i in range(len(new_nodes_names)):
            new_acc = w3.eth.account.create()
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

            

        
        config['agents'] = agents

        with open('/home/'+getpass.getuser()+'/config.json', 'w') as f:
            json.dump(config, f)

        if(len(new_nodes_names)>0):
            click.echo("Registered the latest node(s) on the blockchain.")
        else:
            click.echo("All nodes have already been registered.")

    except FileNotFoundError:
        click.echo("Error: Process could not be completed.")


def reset_config():
    with open('/home/'+getpass.getuser()+'/config.json', 'r') as f:
        config = json.load(f)
    
    config['OASEES_CLUSTER_ID'] = -1
    config['agents'] = {}

    with open('/home/'+getpass.getuser()+'/config.json', 'w') as f:
        json.dump(config,f)


def update_cluster_id(id):
    try:
        with open('/home/'+getpass.getuser()+'/config.json', 'r') as f:
            config = json.load(f)
        
        config['OASEES_CLUSTER_ID'] = id

        with open('/home/'+getpass.getuser()+'/config.json', 'w') as f:
            json.dump(config,f)
    except FileNotFoundError:
        click.echo("Error: Config file doesn't exist in the cli program's directory.")


def config_exists():
    default_config = {'BLOCKCHAIN_IP':'', 'PROVIDER_IP':'', 'IPFS_IP':'', 'ACCOUNT': '', 'KEY':'', 'OASEES_CLUSTER_ID': -1, 'agents':{}}
    try:
        with open('/home/'+getpass.getuser()+'/config.json','r') as f:
            config = json.load(f)
            
        for key in default_config.keys():
            if key not in config.keys():
                with open('/home/'+getpass.getuser()+'/config.json', 'w') as f:
                    json.dump(default_config,f)
                break

    except FileNotFoundError:
        with open('/home/'+getpass.getuser()+'/config.json', 'w') as f:
            config = default_config
            json.dump(config,f)

def config_setup():
    try:
        with open('/home/'+getpass.getuser()+'/config.json', 'r') as f:
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
            with open('/home/'+getpass.getuser()+'/config.json', 'w') as f:
                json.dump(config,f)

    except FileNotFoundError:
        click.echo("Error: config file not found.")
    

config_exists()