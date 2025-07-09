# app.py
from time import sleep
from flask import Flask, request, jsonify, send_from_directory
import json
import os
from pathlib import Path
import subprocess
import re

app = Flask(__name__, static_folder='public', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/contracts/<path:filename>')
def serve_contract(filename):
    return send_from_directory('public/contracts', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('public/js', filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('public/css', filename)

@app.route('/deploy', methods=['POST'])
def deploy_contracts():
    try:

        print("Deploying contracts...")

        data = request.json
        for name, value in data.get('params').items():
            os.environ[name] = str(value)

        result = subprocess.run(["npx", "hardhat", "ignition", "deploy", "./ignition/modules/DAO.ts", "--network", "oasees-blockchain","--deployment-id","dao","--reset"], text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        
        sleep(10)

        result = subprocess.run(["npx", "hardhat", "ignition", "verify", "dao"], capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        
        output_message = extract_contract_info(result.stdout)

        # output_string = '<p>'
        # for info in output_message:
        #     output_string+= f"{info['contract_name']}: {info['url']}<br></br>"
        
        # output_string += '</p>'
        
        response = {
            'success': True,
            'output': output_message
        }

        return jsonify(response)
        
    except Exception as e:
        print(f"Deployment error: {str(e)}")
        import traceback
        traceback.print_exc()  # Print full traceback for debugging

        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/compile', methods=['POST'])
def compile_contract():
    try:
        print("Compiling contract...")

        data = request.json
        source_code = data.get('source')
        name = data.get('contractName')
        
        # Replace @openzeppelin imports with Brownie package imports
        # source_code = source_code.replace(
        #     '@openzeppelin/contracts/',
        #     'OpenZeppelin/openzeppelin-contracts@4.9.3/contracts/'
        # )

        with open(f"contracts/{name}.sol", 'w') as file:
            file.write(source_code)
        
        result = subprocess.run(["npx","hardhat","compile","--force"],capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        # subprocess.run(["npx", "hardhat", "ignition", "deploy", "./ignition/modules/VoteToken.ts", "--network", "oasees-blockchain","--deployment-id","otinanai","--reset"])
        # sleep(10)
        # subprocess.run(["npx", "hardhat", "ignition", "verify", "otinanai"])
        # # Compile using Brownie
        # compiled = compile_source(
        #     source_code,
        #     solc_version="0.8.8",
        # )
        
        # # Create a dictionary to hold all contracts
        # contracts_output = {}
        
        # # Process each contract in the compilation output
        # # Brownie's compile_source returns a dict where keys are contract names
        # for contract_name in compiled.keys():
        #     contract_data = compiled[contract_name]
        #     # Extract just the contract name without the file path
        #     name = contract_name.split(':')[-1]
            
        #     contracts_output[name] = {
        #         'abi': contract_data.abi,
        #         'evm': {
        #             'bytecode': {
        #                 'object': '0x'+contract_data.bytecode
        #             }
        #         }
        #     }

        # print("Compiled contracts:", list(contracts_output.keys()))  # Debug print

        # with open(f"artifacts/contracts/{name}.sol/{name}.json", 'r') as file:
        #     contract_data = json.load(file)

        contracts_output = {}
        # contracts_output[name] = {
        #     'abi': contract_data.get('abi'),
        #     'evm': {
        #         'bytecode': {
        #             'object': contract_data.get('bytecode'),
        #         }
        #     }
        # }

        contracts_output[name] = True

        response = {
            'success': True,
            'output': {
                'contracts': {
                    'contract.sol': contracts_output
                }
            }
        }
        
        return jsonify(response)

    except Exception as e:
        print(f"Compilation error: {str(e)}")
        import traceback
        traceback.print_exc()  # Print full traceback for debugging
        return jsonify({
            'success': False,
            'error': str(e)
        })
    

def extract_contract_info(text):
    # Split the text into lines
    lines = text.split('\n')
    results = []
    
    for i in range(len(lines)):
        # Search for contract name pattern
        contract_match = re.search(r'contracts\/.*\.sol:(\w+)', lines[i])
        if contract_match:
            contract_name = contract_match.group(1)
            # Look for URL in the next line
            if i + 1 < len(lines):
                url_match = re.search(r'(http://[^\s]+)', lines[i + 1])
                if url_match:
                    url = url_match.group(1)
                    results.append({
                        'contract_name': contract_name,
                        'url': url,
                        'contract_address': re.split('/|#', url)[4]
                    })
    
    return results

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=3001)