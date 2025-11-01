from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json
import os

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes for all origins

# API endpoint for a full health check (button click)
@app.route('/api/healthcheck', methods=['GET'])
def health_check():
    try:
        script_path = os.path.join(os.getcwd(), 'HealthCheckScript.ps1')
        command = ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', script_path, '-Action', 'healthcheck']
        
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        
        data = json.loads(result.stdout)
        return jsonify(data)
    
    except subprocess.CalledProcessError as e:
        return jsonify({'status': 'error', 'message': f'PowerShell script error: {e.stderr}'}), 500
    except json.JSONDecodeError:
        return jsonify({'status': 'error', 'message': f'Failed to parse JSON from PowerShell script. Output was: {result.stdout}'}), 500

# NEW API endpoint for installing updates
@app.route('/api/installupdates', methods=['POST'])
def install_updates():
    try:
        script_path = os.path.join(os.getcwd(), 'HealthCheckScript.ps1')
        command = ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', script_path, '-Action', 'installupdates']
        
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        
        data = json.loads(result.stdout)
        return jsonify(data)
    
    except subprocess.CalledProcessError as e:
        return jsonify({'status': 'error', 'message': f'PowerShell script error: {e.stderr}'}), 500
    except json.JSONDecodeError:
        return jsonify({'status': 'error', 'message': f'Failed to parse JSON from PowerShell script. Output was: {result.stdout}'}), 500


# API endpoint for getting initial server details (page load)
@app.route('/api/serverdetails', methods=['GET'])
def server_details():
    try:
        script_path = os.path.join(os.getcwd(), 'GetServerDetails.ps1')
        command = ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', script_path]
        
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        
        data = json.loads(result.stdout)
        return jsonify(data)
    
    except subprocess.CalledProcessError as e:
        return jsonify({'status': 'error', 'message': f'PowerShell script error: {e.stderr}'}), 500
    except json.JSONDecodeError:
        return jsonify({'status': 'error', 'message': f'Failed to parse JSON from PowerShell script. Output was: {result.stdout}'}), 500

# API endpoint for clearing temporary files
@app.route('/api/cleartemp', methods=['POST'])
def clear_temp():
    try:
        script_path = os.path.join(os.getcwd(), 'HealthCheckScript.ps1')
        command = ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', script_path, '-Action', 'cleartemp']
        
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        
        data = json.loads(result.stdout)
        return jsonify(data)
    
    except subprocess.CalledProcessError as e:
        return jsonify({'status': 'error', 'message': f'PowerShell script error: {e.stderr}'}), 500
    except json.JSONDecodeError:
        return jsonify({'status': 'error', 'message': f'Failed to parse JSON from PowerShell script. Output was: {result.stdout}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

