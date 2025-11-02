from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json
import os
from functools import wraps

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# --- User Authentication ---

def load_users():
    with open('users.json', 'r') as f:
        return json.load(f)['users']

# Simple decorator for role-based security
def role_required(role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({'status': 'error', 'message': 'Missing authorization token'}), 403
            
            try:
                # Token is just the role (e.g., "Bearer admin")
                token = auth_header.split(" ")[1]
            except:
                return jsonify({'status': 'error', 'message': 'Invalid token format'}), 403

            if token != role:
                return jsonify({'status': 'error', 'message': f'Insufficient permissions. Requires "{role}" role.'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    users = load_users()
    
    username = data.get('username')
    password = data.get('password')

    for user in users:
        if user['username'] == username and user['password'] == password:
            # In a real app, this would be a JWT. For this project, we just send the role as the "token".
            return jsonify({
                'status': 'success',
                'message': 'Login successful',
                'token': user['role'], # The token is just the role
                'name': user['name'],
                'role': user['role']
            }), 200
            
    return jsonify({'status': 'error', 'message': 'Invalid username or password'}), 401


# --- API Endpoints ---

@app.route('/api/healthcheck', methods=['GET'])
@role_required('admin') # Protected endpoint
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

@app.route('/api/installupdates', methods=['POST'])
@role_required('admin') # Protected endpoint
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


@app.route('/api/serverdetails', methods=['GET'])
# No decorator - all logged-in users can view details
def server_details():
    # Check for any valid token (viewer or admin)
    if not request.headers.get('Authorization'):
         return jsonify({'status': 'error', 'message': 'Missing authorization token'}), 403

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

@app.route('/api/cleartemp', methods=['POST'])
@role_required('admin') # Protected endpoint
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

