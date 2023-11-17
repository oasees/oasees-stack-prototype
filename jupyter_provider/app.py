from flask import Flask, jsonify, request
import requests
import json
import sqlite3
from sqlite_utils import *
from flask_cors import CORS
import docker
import re
import ipfshttpclient
from werkzeug.utils import secure_filename
import signal
import os

app = Flask(__name__)
CORS(app)
create_accountDB()


PORTAL_URL = os.getenv('PORTAL_URL')
INFRA_HOST = os.getenv('INFRA_HOST')
IPFS_HOST = os.getenv('IPFS_HOST')
PORTAL_PORT = os.getenv('PORTAL_PORT')


CONTAINER_PREFIX="oasees-notebook"


client = docker.from_env()


@app.route('/user_login',methods=["POST"])
def user_login():


    data = request.json
    user = data["user"]


    _exists = exists(user)

    print("---------->",_exists)

    if(_exists):
        _token,_port,dao_storage_hash = get_token(user)
        jupyter_url = "http://{}:{}/lab?token={}".format(INFRA_HOST,_port,_token)
    else:

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
                "JUPYTER_ALLOW_ORIGIN": "*"
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


        response = requests.get('http://{}:6002/deploy_dao_storage'.format(INFRA_HOST))
        response = response.json()
        dao_storage_hash = response["dao_storage_hash"]


        insert(user,_token,str(_port),dao_storage_hash)



    print("----------------------->",dao_storage_hash)

    return {"url":jupyter_url,"dao_storage_hash":dao_storage_hash}



@app.route('/ipfs_upload',methods=['POST','PUT'])
def ipfs_upload():
    file = request.files['asset']
    meta = json.loads(request.form['meta'])
    # print(meta)
    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    # print(file)
    file_hash = client.add_bytes(file)



    asset_meta = {
        "contentURI": file_hash,
        "price" : meta["price"],
        "title" : meta["title"],
        "description" : meta["description"]
    }


    meta_hash = client.add_json(json.dumps(asset_meta))

    print("------------>",meta_hash)
    client.close()


    return {"meta_hash":meta_hash}



@app.route('/ipfs_fetch',methods=['GET'])
def ipfs_fetch():
    meta_hash = request.args.get("meta_hash")
    client = ipfshttpclient.connect("/ip4/{}/tcp/5001".format(IPFS_HOST))
    meta_info = json.loads(client.cat(meta_hash))
    client.close()

    return {"meta_info":meta_info}




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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6001)