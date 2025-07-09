from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import shlex
import json

app = Flask(__name__)

CORS(app)



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


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000)