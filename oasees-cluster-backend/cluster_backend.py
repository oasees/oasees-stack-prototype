from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import shlex
import json
import web3

app = Flask(__name__)

CORS(app)

BLOCKCHAIN_URL = "http://10.160.3.172:8545"
# BLOCKSCOUT_API_URL = "http://10.160.3.172:8082/api/v2"

w3 = web3.Web3(web3.HTTPProvider(BLOCKCHAIN_URL))

registered_devices = {}

@app.route('/k8s_api', methods=['POST'])
def execute_kubectl():
    try:
        print(f"Request method: {request.method}")
        print(f"Content-Type: {request.headers.get('Content-Type')}")
        print(f"Raw data: {request.get_data()}")
        
        json_data = request.get_json()
        print(f"Parsed JSON: {json_data}")
        
        if not json_data or 'cmd' not in json_data:
            return jsonify({'error': 'Missing cmd parameter'}), 400
        
        cmd = json_data['cmd']
        
        cmd_list = shlex.split(cmd)
        
        result = subprocess.run(['kubectl'] + cmd_list, 
                              capture_output=True, text=True, check=True)
        
        output = result.stdout
        if output.strip().startswith(('{', '[')):
            try:
                output = json.loads(result.stdout)
            except json.JSONDecodeError:
                pass 
        
        return jsonify(output)
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else e.stdout
        return jsonify({'error': error_msg}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/register-device', methods=['POST'])
def register_device():
    try:
        print(f"Request method: {request.method}")
        print(f"Content-Type: {request.headers.get('Content-Type')}")
        print(f"Raw data: {request.get_data()}")

        json_data = request.get_json()
        print(f"Parsed JSON: {json_data}")

        if not json_data or 'device_id' not in json_data:
            return jsonify({'error': 'Missing device_id parameter'}), 400

        device_id = json_data['device_id']

        account = ''
        pkey = ''

        if device_id in registered_devices:
            account = registered_devices[device_id]['account']
            pkey = registered_devices[device_id]['private_key']

            message = f"Device {device_id} is already registered with account {account}."
        else:
            account_pair = w3.eth.account.create()
            account = account_pair.address
            pkey = w3.to_hex(account_pair.key)


            registered_devices[device_id] = {'account': account, 'private_key': pkey}
            message = f"Device {device_id} registered with account {account}."

        return jsonify({'message': message, 'account': account, 'private_key': pkey}), 201

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({'error': str(e)}), 500
    
@app.route('/devices')
def get_devices():
    try:
        print(f"Request method: {request.method}")
        print(f"Content-Type: {request.headers.get('Content-Type')}")
        print(f"Raw data: {request.get_data()}")
    
        device_accounts = {}
        for device_id, device_info in registered_devices.items():
            device_accounts[device_id] = device_info['account']
        return jsonify(device_accounts), 200
    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000)