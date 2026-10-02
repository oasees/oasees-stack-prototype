from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import shlex
import json
import web3
import sqlite3
import os
import threading
import hmac
from contextlib import contextmanager

app = Flask(__name__)

CORS(app)

BLOCKCHAIN_URL = os.getenv('BLOCKCHAIN_URL', "http://10.160.3.172:8545")
# BLOCKSCOUT_API_URL = "http://10.160.3.172:8082/api/v2"

w3 = web3.Web3(web3.HTTPProvider(BLOCKCHAIN_URL))

# SQLite configuration
DB_PATH = os.getenv('DB_PATH', '/data/devices.db')
db_lock = threading.Lock()

# Database initialization
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                device_id TEXT PRIMARY KEY,
                account TEXT NOT NULL,
                private_key TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        print(f"Database initialized at {DB_PATH}")

@contextmanager
def get_db_connection():
    with db_lock:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

# Initialize database on startup
init_db()

# Shared secret that devices must present to obtain their key pair.
# Strongly recommended; without it anyone on the network can fetch any device's private key.
REGISTRATION_TOKEN = os.getenv('CB_REGISTRATION_TOKEN')
if not REGISTRATION_TOKEN:
    print("WARNING: CB_REGISTRATION_TOKEN is not set - /register-device is unauthenticated "
          "and hands out private keys to any caller.")

# The portal only ever issues read-only `get` commands, so the proxy is restricted to those.
ALLOWED_KUBECTL_RESOURCES = {'nodes', 'node', 'no', 'services', 'service', 'svc',
                             'pods', 'pod', 'po', 'deployments', 'deployment', 'deploy'}
KUBECTL_FLAGS_WITH_VALUE = {'-o', '--output', '-l', '--selector', '-n', '--namespace'}
KUBECTL_FLAGS_NO_VALUE = {'-A', '--all-namespaces'}


def validate_kubectl_args(cmd_list):
    '''Return an error string if the command is not an allowed read-only query.'''
    if len(cmd_list) < 2 or cmd_list[0] != 'get':
        return "Only 'get' commands are allowed"
    i = 1
    while i < len(cmd_list):
        arg = cmd_list[i]
        if arg.startswith('-'):
            flag = arg.split('=', 1)[0]
            if flag in KUBECTL_FLAGS_NO_VALUE:
                pass
            elif flag in KUBECTL_FLAGS_WITH_VALUE:
                if '=' not in arg:
                    i += 1
                    if i >= len(cmd_list):
                        return f"Missing value for flag {flag}"
            else:
                return f"Flag not allowed: {flag}"
        else:
            for resource in arg.split(','):
                if resource.split('/', 1)[0].lower() not in ALLOWED_KUBECTL_RESOURCES:
                    return f"Resource not allowed: {resource}"
        i += 1
    return None

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

        validation_error = validate_kubectl_args(cmd_list)
        if validation_error:
            return jsonify({'error': validation_error}), 403
        
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
        if REGISTRATION_TOKEN:
            supplied = request.headers.get('Authorization', '').removeprefix('Bearer ')
            if not hmac.compare_digest(supplied, REGISTRATION_TOKEN):
                return jsonify({'error': 'Unauthorized'}), 401

        json_data = request.get_json()

        if not json_data or 'device_id' not in json_data:
            return jsonify({'error': 'Missing device_id parameter'}), 400

        device_id = json_data['device_id']

        account = ''
        pkey = ''

        # Check if device exists in database
        with get_db_connection() as conn:
            cursor = conn.execute(
                'SELECT account, private_key FROM devices WHERE device_id = ?',
                (device_id,)
            )
            row = cursor.fetchone()
            
            if row:
                account = row['account']
                pkey = row['private_key']
                message = f"Device {device_id} is already registered with account {account}."
            else:
                account_pair = w3.eth.account.create()
                account = account_pair.address
                pkey = w3.to_hex(account_pair.key)

                # Store in database
                conn.execute(
                    'INSERT INTO devices (device_id, account, private_key) VALUES (?, ?, ?)',
                    (device_id, account, pkey)
                )
                conn.commit()
                
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
        
        with get_db_connection() as conn:
            cursor = conn.execute('SELECT device_id, account FROM devices')
            for row in cursor.fetchall():
                device_accounts[row['device_id']] = row['account']
        
        return jsonify(device_accounts), 200
    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000)