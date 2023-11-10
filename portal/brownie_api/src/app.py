from flask import Flask, jsonify, request
import requests
import json
from flask_cors import CORS
import re
import ipfshttpclient
from werkzeug.utils import secure_filename
import subprocess
import sqlite3
from sqlite_utils import *
import os
from web3 import Web3, constants



app = Flask(__name__)
CORS(app)

PORTAL_URL = os.getenv('PORTAL_URL')
INFRA_HOST = os.getenv('INFRA_HOST')
IPFS_HOST = os.getenv('IPFS_HOST')
PORTAL_PORT = os.getenv('PORTAL_PORT')
BLOCK_CHAIN_IP = os.getenv('BLOCK_CHAIN_IP')

create_contract_infoDB()

command = "brownie networks modify hardhat host=http://{}:8545".format(BLOCK_CHAIN_IP)
process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
stdout, stderr = process.communicate()


@app.route('/get_marketplace_ipfs_hash',methods=["GET"])
def get_marketplace_ipfs_hash():


    ipfs_hash = get_ipfs_hash("Marketplace")
    if(ipfs_hash==None):

        marketplace_regex =  r"\s+Marketplace deployed at: (0x[0-9a-fA-F]+)\s+"
        nft_regex = r"NFT deployed at: (0x[0-9a-fA-F]+)"
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

        command = "brownie run  scripts/deploy_marketplace.py --network hardhat"


        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        stdout, stderr = process.communicate()
        output = stdout.decode('utf-8').split('\n')

        marketplace_address=""
        nft_address=""

        for line in output:

            if("Marketplace deployed at:" in line):
                marketplace_address = str(line.split(":")[1].strip(" "))

            if("NFT deployed at:" in line):
                nft_address = str(line.split(":")[1].strip(" "))


        with open("build/contracts/Marketplace.json", "r") as json_file:
            marketplace_abi = json.load(json_file)

        with open("build/contracts/NFT.json", "r") as json_file:
            nft_abi = json.load(json_file)


        marketplace_info ={
            "marketplace_address":ansi_escape.sub('',marketplace_address),
            "marketplace_abi":marketplace_abi,
            "nft_address":ansi_escape.sub('',nft_address),
            "nft_abi":nft_abi
        }


        client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
        ipfs_hash = client.add_json(marketplace_info)
        client.close()

        insert("Marketplace",ipfs_hash)




    return {"ipfs_hash":ipfs_hash}



@app.route('/ipfs_contracts_marketplace',methods=["GET"])
def ipfs_contracts_marketplace():

    ipfs_hash = request.args.get("ipfs_hash")


    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    ipfs_json = client.cat(ipfs_hash)
    ipfs_json = ipfs_json.decode("UTF-8")

    ipfs_json = json.loads(ipfs_json)

    return {"marketplace":ipfs_json}



@app.route('/deploy_dao_storage',methods=["GET"])
def deploy_dao_storage():

    dao_storage_regex =  r"\s+DaoStorage deployed at: (0x[0-9a-fA-F]+)\s+"
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

    command = "brownie run  scripts/deploy_dao_storage.py --network hardhat"


    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    stdout, stderr = process.communicate()
    output = stdout.decode('utf-8').split('\n')


    daostorage_address=''
    daostorage_abi=''

    for line in output:
        if("DaoStorage deployed at:" in line):
            daostorage_address = str(line.split(":")[1].strip(" "))


    with open("build/contracts/DaoStorage.json", "r") as json_file:
        daostorage_abi = json.load(json_file)

    daostorage_info ={
        "daostorage_address":ansi_escape.sub('',daostorage_address),
        "daostorage_abi":daostorage_abi
    }


    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    ipfs_hash = client.add_json(daostorage_info)
    client.close()


    return {"dao_storage_hash":ipfs_hash}


@app.route('/create_dao',methods=["GET"])
def create_dao():
    ipfs_hash = request.args.get("dao_storage_hash")
    governor_account = request.args.get("governor_account")
    dao_name = request.args.get("dao_name")
    dao_desc = request.args.get("dao_desc")



    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    ipfs_json = client.cat(ipfs_hash)
    ipfs_json = ipfs_json.decode("UTF-8")
    ipfs_json = json.loads(ipfs_json)

    daostorage_address = ipfs_json['daostorage_address']
    daostorage_abi = ipfs_json['daostorage_abi']['abi']

    web3 = Web3(Web3.HTTPProvider("http://{}:8545".format(BLOCK_CHAIN_IP)))

    dao_regex =  r"\s+GovernorContract deployed at: (0x[0-9a-fA-F]+)\s+"
    token_regex =  r"\s+GovernanceToken deployed at: (0x[0-9a-fA-F]+)\s+"
    box_regex =  r"\s+Box deployed at: (0x[0-9a-fA-F]+)\s+"
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

    command = "brownie run scripts/deploy_dao.py run {} --network hardhat".format(governor_account)


    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    stdout, stderr = process.communicate()
    output = stdout.decode('utf-8').split('\n')

    governance_address=''
    governance_abi=''

    governance_token_address=''
    governance_token_abi=''


    box_address=''
    box_abi=''


    for line in output:
        if("GovernorContract deployed at:" in line):
            governance_address = str(line.split(":")[1].strip(" "))

        if("GovernanceToken deployed at:" in line):
            governance_token_address = str(line.split(":")[1].strip(" "))


        if("Box deployed at:" in line):
            box_address = str(line.split(":")[1].strip(" "))


    with open("build/contracts/GovernorContract.json", "r") as json_file:
        governance_abi = json.load(json_file)

    with open("build/contracts/GovernanceToken.json", "r") as json_file:
        governance_token_abi = json.load(json_file)

    with open("build/contracts/Box.json", "r") as json_file:
        box_abi = json.load(json_file)


    dao_info = {
        "dao_name":dao_name,
        "dao_desc":dao_desc,
        "governance_address": ansi_escape.sub('',governance_address),
        "governance_abi": governance_abi['abi'],
        "governance_token_address": ansi_escape.sub('',governance_token_address),
        "governance_token_abi": governance_token_abi['abi'],
        "box_address": ansi_escape.sub('',box_address),
        "box_abi": box_abi['abi']
    }


    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    ipfs_hash = client.add_json(dao_info)
    client.close()
    dao_storage = web3.eth.contract(address=daostorage_address, abi=daostorage_abi)
    dao_storage.functions.addHash(ipfs_hash).transact()


    return {"dao_created":"ok"}


@app.route('/list_dao',methods=["GET"])
def list_dao():

    dao_list=[]

    ipfs_hash = request.args.get("dao_storage_hash")

    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    ipfs_json = client.cat(ipfs_hash)
    ipfs_json = ipfs_json.decode("UTF-8")
    ipfs_json = json.loads(ipfs_json)
    dao_storage_address = ipfs_json["daostorage_address"]
    dao_storage_abi = ipfs_json["daostorage_abi"]['abi']


    web3 = Web3(Web3.HTTPProvider("http://{}:8545".format(BLOCK_CHAIN_IP)))

    dao_storage = web3.eth.contract(address=dao_storage_address, abi=dao_storage_abi)

    dao_hashes = dao_storage.functions.getStoredHashes().call()

    for dh in dao_hashes:
        print(dh)
        ipfs_json = client.cat(dh)
        ipfs_json = ipfs_json.decode("UTF-8")
        ipfs_json = json.loads(ipfs_json)
        ipfs_json['dao_hash'] = dh
        dao_list.append(ipfs_json)


    client.close()

    return {"dao_list":dao_list}


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6002)