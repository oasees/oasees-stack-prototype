import threading
from flask import Flask, request, jsonify
import time
import requests
import time
from dao_event_watcher import event_watcher
from utils import validate_json_format,load_contracts
from agent_class import Agent
import os

app = Flask(__name__)

print("Agent booting up...")

agent = None

dao_info = {
    'governance' : None,
    'token': None,
    'box': None
}

config = {
    "metric_index": '',
    "propose_on": {
        "events" : [],
        'proposal_contents': []
    },
    "actions_map": []
}


device_name = os.environ.get('NODE_NAME')

env_port = os.environ.get('AGENT_PORT')
port = int(env_port) if env_port else 5100
# device_name = "labpc"
print(device_name)


status_code = 500

while status_code != (201 or 200):
    try:
        # response = requests.post("http://cluster-backend.default.svc.cluster.local:4000/register-device", json={'device_id': device_name})
        response = requests.post("http://10.160.1.227:30021/register-device", json={'device_id': device_name})
        status_code = response.status_code
        data = response.json()

        message = data['message']
        account = data['account']
        private_key = data['private_key']
    except:
        print("Failed to register device. Retrying...")
        time.sleep(5)
        continue


print(f"Account retrieved: {account,private_key}")


BLOCKCHAIN_URL = "http://10.160.3.172:8545"
BLOCKSCOUT_API_URL = "http://10.160.3.172:8082/api/v2"

# BLOCKCHAIN_URL = os.environ['BLOCKCHAIN_URL']
# BLOCKSCOUT_API_URL = os.environ['BLOCKSCOUT_API']

w3, marketplace_contract, nft_contract = load_contracts(BLOCKCHAIN_URL,BLOCKSCOUT_API_URL)



agent_info = {
    'device_name': device_name,
    'w3': w3,
    'account': account,
    'private_key': private_key,
    'marketplace_contract': marketplace_contract,
    'nft_contract': nft_contract,
    'dao_info': dao_info,
    'config': config,
    'BLOCKSCOUT_API_URL': BLOCKSCOUT_API_URL
    }


join_event_thread = threading.Thread(target=event_watcher, args=(agent_info,))
join_event_thread.start()


@app.route('/status', methods=['GET'])
def status():
    str_dao_info = {}

    for name, contract in dao_info.items():
        if contract:
            str_dao_info[name] = contract.address

    return jsonify({'account':agent_info['account'], 'dao_info': str_dao_info, 'config': agent_info['config']})


@app.route('/configure', methods=['POST'])
def configure():
    if not agent_info['dao_info']['governance']:
        return jsonify({'message': 'Agent is not member of a DAO yet. Please register first.'}), 400
    else:
        config = request.get_json()

        is_valid, message = validate_json_format(config)
        if not is_valid:
            return jsonify({'message': message}), 400

        agent_info['config'] = config

        global agent
        if not agent:
            agent = Agent(agent_info)
        else:
            agent.update_config(config)


        return jsonify({'message': 'Configuration updated successfully'})



if __name__ == '__main__':
    print('hola')
    app.run(host="0.0.0.0", port=port, threaded=True)
