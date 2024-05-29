import sys
from web3 import Web3
from dotenv import load_dotenv
import ipfshttpclient
import json
import requests
import yaml
import os

from kubernetes import client, config
from .deploy_pipeline import create_job
from .cluster_ipfs_upload import assets_to_ipfs

load_dotenv()
__IPFS_HOST = os.getenv('IPFS_HOST')
__BLOCK_CHAIN_IP = os.getenv('BLOCK_CHAIN_IP')
__ACCOUNT_ADDRESS = os.getenv('ACCOUNT_ADDRESS')

if(__ACCOUNT_ADDRESS):
    __ACCOUNT_ADDRESS = Web3.to_checksum_address(str(__ACCOUNT_ADDRESS))


###### INITIALIZE THE CONNECTIONS TO THE SERVICES AND CONTRACTS INVOLVED ######

__web3 = Web3(Web3.HTTPProvider(f"http://{__BLOCK_CHAIN_IP}:8545"))                    # BLOCKCHAIN
__response = requests.get(f'http://{__IPFS_HOST}:6001/ipfs_portal_contracts')
__data = __response.json()
__ipfs_json = __data['portal_contracts']


__nft_abi = __ipfs_json['nft_abi']             
__nft_address = __ipfs_json['nft_address']
__marketplace_abi = __ipfs_json['marketplace_abi']
__marketplace_address = __ipfs_json['marketplace_address']


__nft = __web3.eth.contract(address=__nft_address, abi=__nft_abi)                           # NFT contract
__marketplace = __web3.eth.contract(address=__marketplace_address, 
                                    abi=__marketplace_abi)                            # Marketplace contract





def __getPurchases():
    if (__ACCOUNT_ADDRESS):

        client = ipfshttpclient.connect(f"/ip4/{__IPFS_HOST}/tcp/5001")                       # IPFS

        results = __marketplace.caller({'from': __ACCOUNT_ADDRESS}).getMyNfts()
        purchases=[]

        for r in results:
            token_id = r[1]
            content_hash = __nft.functions.tokenURI(token_id).call()
            metadata_hash = r[5]

            

            metadata = client.cat(metadata_hash)
            metadata = metadata.decode("UTF-8")
            metadata = json.loads(json.loads(metadata))

            purchases.append({'contentURI': content_hash, 'title':metadata['title']})

        client.close()

        return purchases


def __getDevices():
    results = __marketplace.caller({'from': __ACCOUNT_ADDRESS}).getMyDevices()
    devices = []

    client = ipfshttpclient.connect(f"/ip4/{__IPFS_HOST}/tcp/5001")  

    for r in results:
        token_id = r[1]
        content_hash = __nft.functions.tokenURI(token_id).call()

        content = client.cat(content_hash)
        content = content.decode("UTF-8")
        content = json.loads(content)
        
        devices.append({'name': content['name'], 'endpoint':content['device_endpoint'][7:]})
    
    client.close()
    
    return devices

def __getDaos():
    results = __marketplace.caller({'from':__ACCOUNT_ADDRESS}).getJoinedDaos()
    daos = []

    client = ipfshttpclient.connect(f"/ip4/{__IPFS_HOST}/tcp/5001")  
    for r in results:
        token_id = r[5]
        content_hash = __nft.functions.tokenURI(token_id).call()

        content = client.cat(content_hash)
        content = content.decode("UTF-8")
        content = yaml.safe_load(content)

        print(content)

    client.close()


def __get_config():
    results = __marketplace.caller({'from':__ACCOUNT_ADDRESS}).getJoinedDaos()

    client = ipfshttpclient.connect(f"/ip4/{__IPFS_HOST}/tcp/5001") 
    for r in results:
        if(r[6]):
            token_id = r[5]
            content_hash = __nft.functions.tokenURI(token_id).call()

            content = client.cat(content_hash)
            content = content.decode("UTF-8")
            config = yaml.safe_load(content)

    with open('config', 'w') as f:
        yaml.safe_dump(config,f)

    client.close()


def my_algorithms():
    '''Returns a list with all the algorithms purchased from your account
        on the OASEES Marketplace.''' 

    purchases = __getPurchases()


    print("\nOwned algorithms")
    print("---------------------------------")
    i=1
    if(purchases):
        for purchase in purchases:
            print(str(i) + ") " + purchase['title'])
            i+=1
    
    else:
        print("You have not bought any items from the marketplace yet.")



def my_devices():
    '''Returns a list with all the devices purchased / uploaded from your account
        on the OASEES Marketplace.''' 

    devices = __getDevices()

    print("\nOwned devices")
    print("---------------------------------")
    i=1
    if(devices):
        for device in devices:
            print(str(i) + ") " + device['name'] + " | " + device['endpoint'])
            i+=1
    
    else:
        print("You have not bought any devices from the marketplace yet.")




# def deploy_algorithm(algorithm_title:str):
#     '''Deploys a purchased algorithm on all your connected devices.

#         - algorithm_title: Needs to be provided in "string" form.
    
#         e.g. algorithm.py -> deploy_algorithm("algorithm.py")
#     '''

#     purchases = __getPurchases()
#     devices = __getDevices()
#     found = False
#     for purchase in purchases:
#         if found:
#             break

#         if(purchase['title']==algorithm_title):
#             found = True
#             algo_hash = purchase['contentURI']

#             client = ipfshttpclient.connect(f"/ip4/{__IPFS_HOST}/tcp/5001")                       # IPFS

#             for device in devices:
#                 __response = requests.post("http://{}/deploy_algorithm".format(device['endpoint']), json = {'algorithm_hash': algo_hash, 'algorithm_name':algorithm_title})                 
#                 print(__response.text)
#             client.close()
            

#     if not found:
#         print("The file you requested was not found in your purchases.")



# def deploy_local_file(path:str):
#     '''Deploys the file found in the specified path on all your connected devices.
    
#         - path: -> Needs to be provided in "string" form.
#                 -> Is equal to the filename when the file is located in
#                    the Jupyter Notebook's directory.
    
#         e.g. algorithm.py -> deploy_local_file("algorithm.py")
#     '''

#     devices = __getDevices()
#     file = open(path,"rb")

#     for device in devices:
#         __response= requests.post("http://{}/deploy_file".format(device['endpoint']), files={'file': file})                 
#         print(__response.text)
    
#     file.close()


def build_image(image_folder_path):

    '''Deploys a job on the Kubernetes cluster associated with your blockchain
    account, which builds a container image out of your specified folder.
    The image will then be stored on your master node, and will be available
    for deployment on any of the cluster's nodes specified in your manifest file. 
    
        - image_folder_path: Needs to be providerd in "string" form.

    e.g. DApp_Image_Folder -> build_image("DApp_Image_Folder")

    '''

    __get_config()

    with open('config', 'r') as f:
        kube_config = yaml.safe_load(f)

    master_ip = kube_config['clusters'][0]['cluster']['server']
    master_ip = master_ip.split(':')

    ipfs_api_url = "http://{}:31005".format(master_ip[1][2:])
    directory_path = image_folder_path
    ipfs_cid = assets_to_ipfs(ipfs_api_url, directory_path)
    print(ipfs_cid)
    app_name = directory_path.split('/')[-1].lower()
    print(app_name)
    config.load_kube_config("./config")
    # config.load_kube_config()
    batch_v1 = client.BatchV1Api()
    resp = create_job(batch_v1,ipfs_cid, app_name)
    print(resp)


def deploy_manifest(manifest_file_path):
    '''Deploys all the objects included in your specified manifest file, on the
    Kubernetes cluster associated with your blockchain account.

    - manifest_file_path: Needs to be providerd in "string" form.

    e.g. manifest.yaml -> build_image("manifest.yaml")'''

    __get_config()

    # Load kube config
    config.load_kube_config("./config")

    api_instance = client.CustomObjectsApi()

    try:
        # Read manifest file
        with open(manifest_file_path, 'r') as f:
            manifest_documents = yaml.safe_load_all(f)

            # Iterate over each document and deploy it
            for manifest in manifest_documents:
                try:
                    if manifest['kind'] == 'Service':
                        # Deploy Service
                        api_response = client.CoreV1Api().create_namespaced_service(
                            namespace="default",
                            body=manifest
                        )
                    elif manifest['kind'] == 'Ingress':
                        # Deploy Ingress
                        api_response = client.NetworkingV1Api().create_namespaced_ingress(
                            namespace="default",
                            body=manifest
                        )
                    else:
                        # Deploy other resources
                        api_response = api_instance.create_namespaced_custom_object(
                            group=manifest['apiVersion'].split('/')[0],
                            version=manifest['apiVersion'].split('/')[1],
                            namespace="default",
                            plural=manifest['kind'].lower() + 's',  # Convert resource kind to plural form
                            body=manifest
                        )
                    print("Manifest deployed successfully!")
                except Exception as e:
                    print(f"Error deploying manifest: {e}")
                    print("Problematic manifest:")
                    print(yaml.dump(manifest))  # Print the problematic manifest
    except Exception as e:
        print(f"Error reading manifest file: {e}")



def instructions():
    
    # \033[1m{deploy_algorithm.__name__}\033[0m(algorithm_title: str) \t \t
    #     {deploy_algorithm.__doc__}


    # \033[1m{deploy_local_file.__name__}\033[0m(path: str) \t   \t
    #     {deploy_local_file.__doc__}

    text = (f'''
    \033[1m{my_algorithms.__name__}\033[0m() \t\t
        {my_algorithms.__doc__}


    \033[1m{my_devices.__name__}\033[0m() \t   \t
        {my_devices.__doc__}
    
        
    \033[1m{build_image.__name__}\033[0m() \t  \t
        {build_image.__doc__}

        
    \033[1m{deploy_manifest.__name__}\033[0m() \t      \t
        {deploy_manifest.__doc__}

        
    \033[1m{instructions.__name__}\033[0m() \t \t
        Reprints the above documentation.
        ''')
    
    __print_msg_box(text,title="\033[1mOASEES SDK methods\033[0m \t \t")

 
def __print_msg_box(msg, indent=1, width=None, title=None):
    """Print message-box with optional title."""
    lines = msg.split('\n')
    space = " " * indent
    if not width:
        width = max(map(len, lines))
    box = f'╔{"═" * (width + indent * 2)}╗\n'  # upper_border
    if title:
        box += f'║{space}{title:<{width}}{space}║\n'  # title
        box += f'║{space}{"-" * len(title):<{width}}{space}║\n'  # underscore
    box += ''.join([f'║{space}{line:<{width}}{space}║\n' for line in lines])
    box += f'╚{"═" * (width + indent * 2)}╝'  # lower_border
    print(box)

instructions()