from flask import Flask, jsonify, request
import requests
import json
import sqlite3
from sqlite_utils import *
from contract_functions import *
from flask_cors import CORS
import docker
import re
import ipfshttpclient
from werkzeug.utils import secure_filename
import signal
import os
import web3
from web3.middleware import geth_poa_middleware
from retrying import retry

app = Flask(__name__)
CORS(app)
create_accountDB()


PORTAL_URL = os.getenv('PORTAL_URL')
INFRA_HOST = os.getenv('INFRA_HOST')
IPFS_HOST = os.getenv('IPFS_HOST')
PORTAL_PORT = os.getenv('PORTAL_PORT')
BLOCK_CHAIN_IP = os.getenv('BLOCK_CHAIN_IP')


# PORTAL_URL = '10.150.0.151'
# INFRA_HOST = '10.150.0.151'
# IPFS_HOST = '10.150.0.151'
# PORTAL_PORT = '10.150.0.151'
# BLOCK_CHAIN_IP = '10.150.0.151'
# PORTAL_PORT = 3000


@retry(stop_max_attempt_number=3, wait_fixed=2000)
def connect_to_blockchain():
    try:
        w3 = web3.Web3(web3.HTTPProvider("http://{}:8545".format(BLOCK_CHAIN_IP)))
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        return w3
    except Exception as e:
        # Log or handle the exception if needed
        print("Connection failed:", e)
        raise
        


w3 = connect_to_blockchain()


CONTAINER_PREFIX="oasees-notebook"


@app.route('/user_exists',methods=["POST"])
def user_exists():

    
    data = request.json
    user = data["user"]
    _exists = exists(user)
    if(_exists):
        return {
            "exists":1,
            "ipfs_hash":get_hash_fromDb(user)
        }
    else:
        return {
            "exists":0,
            "ipfs_hash":""
        }




@app.route('/new_user',methods=["POST"])
def new_user():


    data = request.json
    user = data["user"]
    account_token_address = data["account_token_address"]
    dao_storage_address = data["daoStorage_address"]

    client = docker.from_env()
    c=count()
    _port=8888+c

    container = client.containers.run(
        "jupyter/base-notebook:latest",
        detach=True,
        name=CONTAINER_PREFIX+"-"+user,  
        ports={"8888/tcp": _port}, 
        environment={
            "CHOWN_HOME": "yes",
            "NB_USER": "wasinw",
            "JUPYTER_ENABLE_LAB": "yes",
            "JUPYTER_ALLOW_ORIGIN": "*",
            "ACCOUNT_ADDRESS": user,
            "DAO_STORAGE_ADDRESS": dao_storage_address,
            "IPFS_HOST": IPFS_HOST,
            "BLOCK_CHAIN_IP": BLOCK_CHAIN_IP
        },
        tty=True,
        remove=True,
        command="/bin/bash" 
    )

    tornado_settings={
        'headers': { 
            'Content-Security-Policy': 'frame-ancestors replace http://{}:{}'.format(PORTAL_URL,PORTAL_PORT),
            'Access-Control-Allow-Origin':'http://{}:{}'.format(PORTAL_URL,PORTAL_PORT)
            }
    }

    settings_str=str(tornado_settings).replace("replace","\\'self\\'")

    container.exec_run("/bin/bash -c \"pip install oasees-sdk\"")
    command_inside_container = "jupyter lab --NotebookApp.tornado_settings=\"{}\"".format(settings_str)



    exec_result = container.exec_run(command_inside_container,stdout=True, stderr=True, stream=True)



    token_pattern = r"token=([^\s]+)"
    _token=""
    found=False
    for line in exec_result.output:
        l=line.decode("utf-8").strip()
        tok = re.findall(token_pattern,l)
        for t in tok:
            _token=t
            found=True
            break

        if(found):
            break

    jupyter_url = "http://{}:{}/lab?token={}".format(INFRA_HOST,_port,_token)


    print(account_token_address,user)

    insert(user,account_token_address)

    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    account_info = {
        "daoStorage_address" : dao_storage_address,
        "jupyter_url" : jupyter_url
    }


    account_hash = client.add_json(json.dumps(account_info))

    return {"account_hash":account_hash}




@app.route('/ipfs_upload',methods=['POST','PUT'])
def ipfs_upload():
    file = request.files['asset']
    meta = json.loads(request.form['meta'])
    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    file_hash = client.add_bytes(file)



    asset_meta = {
        "price" : meta["price"],
        "title" : meta["title"],
        "description" : meta["description"]
    }


    meta_hash = client.add_json(json.dumps(asset_meta))

    client.close()


    return {
        "meta_hash":meta_hash,
        "file_hash":file_hash
    }



@app.route('/ipfs_fetch',methods=['GET'])
def ipfs_fetch():
    ipfs_hash = request.args.get("ipfs_hash")


    print(ipfs_hash)

    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    content = json.loads(client.cat(ipfs_hash))
    client.close()

    return {"content":content}



@app.route('/ipfs_portal_contracts',methods=["GET"])
def get_marketplace_ipfs_hash():
    ipfs_hash = get_hash_fromDb('portal')


    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    ipfs_json = client.cat(ipfs_hash)
    ipfs_json = ipfs_json.decode("UTF-8")

    ipfs_json = json.loads(ipfs_json)

    return {"portal_contracts":ipfs_json}




@app.route('/transfer_tokens',methods=["POST"])
def tranfer_tokens():


    data = request.json
    account = data["user"]
    dao_token_address = data["token_address"]
    dao_token_abi = data["token_abi"]

    transer_dao_tokens(w3,account,dao_token_address,dao_token_abi)


    return {"tokens_transfered":"ok"}




def sigterm_handler(signal, frame):
    print("Received SIGTERM. Shutting down gracefully...")
    client = docker.from_env()

    docker_containers = client.containers.list(all=True)


    CONTAINER_PREFIX="oasees-notebook"

    for dc in docker_containers:
        if(CONTAINER_PREFIX in dc.name):
            print(dc.name)
            dc.remove(force=True)

    exit(0)


signal.signal(signal.SIGTERM, sigterm_handler)



@retry(stop_max_attempt_number=3, wait_fixed=2000)  # Retry 3 times with a 2-second interval
def connect_to_ipfs():
    try:
        client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
        return client
    except Exception as e:
        # Log or handle the exception if needed
        print("Connection failed:", e)
        raise



def oasees_genesis():

    market_place_address, market_place_abi = deploy_marketplace_contract(w3)
    nft_address, nft_abi = deploy_nft_contract(w3,market_place_address)
    dao_indexer_address, dao_indexer_abi = deploy_daoIndexer(w3) 


    accountToken_abi, accountToken_bytecode = get_account_token_specs()

    daoStorage_abi, daoStorage_bytecode = get_daoStorage_specs()


    portal_contract_info ={
        "marketplace_address": market_place_address,
        "marketplace_abi": market_place_abi,
        "nft_address": nft_address,
        "nft_abi": nft_abi,
        "dao_indexer_address": dao_indexer_address,
        "dao_indexer_abi": dao_indexer_abi,
        "accountToken_bytecode": accountToken_bytecode,
        "accountToken_abi": accountToken_abi,
        "daoStorage_bytecode": daoStorage_bytecode,
        "daoStorage_abi": daoStorage_abi

    }

    client = connect_to_ipfs()
    # client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    ipfs_hash = client.add_json(portal_contract_info)
    client.close()

    print(ipfs_hash)
    insert("portal",ipfs_hash)



if __name__ == '__main__':
    oasees_genesis()
    app.run(host='0.0.0.0', port=6001)