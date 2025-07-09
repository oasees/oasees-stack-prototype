import threading
from flask import Flask, request, jsonify
import tempfile
import subprocess
import os
import sys
from io import StringIO
import queue
import time
from dotenv import load_dotenv
import web3
from dao_event_watcher import event_watcher
from contract_loader import load_contracts 


app = Flask(__name__)

dao_info = {
    'governance' : None,
    'token': None,
    'box': None
}

# Info structure
current_execution = {
    'running': False,
    'output': [],
    'status': 'idle',  # idle, running, completed, failed
    'process': None,
    'start_time': None
}

load_dotenv()
BLOCKCHAIN_URL = os.environ['BLOCKCHAIN_URL']
BLOCKSCOUT_API_URL = os.environ['BLOCKSCOUT_API']

w3, account, pkey, marketplace_contract, nft_contract = load_contracts(BLOCKCHAIN_URL,BLOCKSCOUT_API_URL)


event_watcher_info = {
    'w3': w3,
    'account': account,
    'pkey': pkey,
    'marketplace_contract': marketplace_contract,
    'nft_contract': nft_contract,
    'dao_info': dao_info,
    'BLOCSCOUT_API_URL': BLOCKSCOUT_API_URL
    }


join_event_thread = threading.Thread(target=event_watcher, args=(event_watcher_info,))
join_event_thread.start()




def execute_code_sync(code):
    global current_execution

    try:
        # "Initialize" process info
        current_execution['running'] = True
        current_execution['status'] = 'running'
        current_execution['output'] = []
        current_execution['start_time'] = time.time()

        # Create temporary file to execute in a subprocess
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
            temp_file.write(code)
            temp_file_path = temp_file.name
        
        
        # Execute temp file
        process = subprocess.Popen(
            [sys.executable, '-u', temp_file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,  # Line buffered
            universal_newlines=True
        )
        
        # Process tracking
        current_execution['process'] = process

        # Process output storing
        for line in iter(process.stdout.readline, ''):
            if line:
                current_execution['output'].append({
                    'timestamp': time.time(),
                    'text': line.rstrip()
                })

        return_code = process.wait()
    
        if return_code == 0:
            current_execution['status'] = 'completed'
        else:
            current_execution['status'] = 'failed'
        
    except Exception as e:
        current_execution['status'] = 'failed'
        current_execution['output'].append({
            'timestamp': time.time(),
            'text': f'ERROR: {str(e)}'
        })
    finally:
        current_execution['running'] = False
        current_execution['process'] = None
        try:
            os.unlink(temp_file_path)
        except:
            pass


@app.route('/execute', methods=['POST'])
def execute_code():

    if(dao_info['governance']):
        try:
            # Get the uploaded file BEFORE starting thread
            if 'file' not in request.files:
                return jsonify({'error': 'No file uploaded'}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Read the Python code BEFORE starting thread
            code = file.read().decode('utf-8')
            
            # Start execution in thread - pass code as parameter
            thread = threading.Thread(
                target=execute_code_sync,
                args=(code,)  # Pass code directly
            )
            thread.daemon = True
            thread.start()

            return jsonify({'status': 'success', 'message': 'Code execution started'})
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'status': 'error', 'message': 'Not registered to any DAO yet.'})

@app.route('/output', methods=['GET'])
def get_output():
    """Get execution output"""
    since = int(request.args.get('since', 0))  # Get lines since this index
    return jsonify({
        'status': current_execution['status'],
        'running': current_execution['running'],
        'output': current_execution['output'][since:],
        'total_lines': len(current_execution['output'])
    })

@app.route('/status', methods=['GET'])
def status():
    if join_event_thread.is_alive():
        return jsonify({'account': account, 'status': 'Not registered to any DAO yet.'})
    else:
        return jsonify({'account': account, 'status': f'Registered to DAO: {dao_info}'})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, threaded=True)
    