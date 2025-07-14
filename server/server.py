import matplotlib
matplotlib.use('Agg')  # Set backend before importing pyplot
import matplotlib.pyplot as plt
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit.qasm2 import dumps as qasm_dumps
from qiskit.visualization import plot_bloch_multivector, plot_histogram
from qiskit.quantum_info import partial_trace
from qiskit_aer import Aer, AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error, pauli_error
import base64
import io
import tempfile
import numpy as np
import json
import os
import tempfile
import uuid
from werkzeug.utils import secure_filename
import traceback

# Debug utilities
def debug_print(message, level="INFO"):
    """Enhanced debug printing with emojis and levels"""
    emoji_map = {
        "INFO": "ℹ️",
        "SUCCESS": "✅", 
        "ERROR": "❌",
        "WARNING": "⚠️",
        "DEBUG": "🔍"
    }
    print(f"[{emoji_map.get(level, 'ℹ️')} {level}] {message}")

def log_request_info(endpoint_name):
    """Log detailed request information"""
    debug_print(f"🚀 {endpoint_name} endpoint called", "INFO")
    debug_print(f"📍 Remote addr: {request.remote_addr}", "DEBUG")
    debug_print(f"🔗 User agent: {request.headers.get('User-Agent', 'Unknown')[:50]}...", "DEBUG")
    debug_print(f"📋 Content type: {request.content_type}", "DEBUG")

app = Flask(__name__)

# Generate a more secure secret key for sessions
# In production, use a fixed secret key from environment variables
import secrets
app.secret_key = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(32))

# Simplified CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5002", "http://127.0.0.1:5002"],
        "supports_credentials": True,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Cookie"],
        "expose_headers": ["Set-Cookie"]
    },
    r"/health": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5002", "http://127.0.0.1:5002"],
        "supports_credentials": True,
        "methods": ["GET"],
        "allow_headers": ["Content-Type", "Authorization", "Cookie"],
        "expose_headers": ["Set-Cookie"]
    }
})

CHALLENGES = [
    {
        'id': 1,
        'name': 'Create Bell State',
        'description': 'Construct a circuit that creates an entangled Bell state between qubits 0 and 1 (|00⟩ + |11⟩)/√2',
        'solution': 'H 0; CX 0 1',
        'difficulty': 'Beginner',
        'hint': 'Start by putting the first qubit in superposition, then entangle it with the second',
        'num_qubits': 2
    },
    {
        'id': 2,
        'name': 'GHZ State',
        'description': 'Create a 3-qubit GHZ state (|000⟩ + |111⟩)/√2',
        'solution': 'H 0; CX 0 1; CX 0 2',
        'difficulty': 'Intermediate',
        'hint': 'Extend the Bell state concept to three qubits',
        'num_qubits': 3
    },
    {
        'id': 3,
        'name': 'Superposition',
        'description': 'Put a single qubit in superposition state (|0⟩ + |1⟩)/√2',
        'solution': 'H 0',
        'difficulty': 'Beginner',
        'hint': 'You only need one gate for this challenge',
        'num_qubits': 1
    },
    {
        'id': 4,
        'name': 'Entangled State',
        'description': 'Create an entangled state where |01⟩ and |10⟩ are equally likely',
        'solution': 'H 0; CX 0 1; X 1',
        'difficulty': 'Advanced',
        'hint': 'Create entanglement then flip one qubit',
        'num_qubits': 2
    }
]

# Session configuration - optimized for development and production
import datetime

# Check if we're in development (localhost)
# Auto-detect development mode more accurately
is_development = (
    os.environ.get('FLASK_ENV') == 'development' or 
    os.environ.get('FLASK_DEBUG') == '1' or
    'localhost' in os.environ.get('FLASK_HOST', '') or
    not os.environ.get('FLASK_ENV')  # Default to development if not explicitly set
)

app.config.update(
    # Session cookie settings
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=False if is_development else True,  # Allow HTTP in development
    SESSION_COOKIE_HTTPONLY=False,  # Allow JavaScript access for debugging (set to True in production)
    PERMANENT_SESSION_LIFETIME=datetime.timedelta(days=7),  # 7 days for better persistence
    
    # Additional session security
    SESSION_COOKIE_NAME='qiskit_session',
    SESSION_REFRESH_EACH_REQUEST=True,
    SESSION_COOKIE_DOMAIN=None,  # Let Flask handle domain automatically
    SESSION_COOKIE_PATH='/',     # Ensure cookies work for all paths
    
    # Make cookies persist across browser sessions
    SESSION_COOKIE_MAX_AGE=datetime.timedelta(days=7).total_seconds()
)

# Session debugging utilities
def log_session_info(endpoint_name):
    """Log session information for debugging"""
    session_id = request.cookies.get('qiskit_session', 'No session cookie')
    has_circuit = 'current_circuit' in session
    print(f"[SESSION DEBUG] {endpoint_name}")
    print(f"  Session ID: {session_id[:20]}..." if len(session_id) > 20 else f"  Session ID: {session_id}")
    print(f"  Has circuit in session: {has_circuit}")
    print(f"  Session keys: {list(session.keys())}")
    print(f"  Session permanent: {session.permanent}")
    return session_id

@app.before_request
def make_session_permanent():
    """Ensure sessions are permanent and track session info"""
    session.permanent = True
    
    # Add session debugging for API endpoints
    if request.path.startswith('/api/'):
        log_session_info(f"BEFORE {request.path}")

# In-memory backup storage for circuit data (as fallback)
circuit_backup_storage = {}

def get_session_id():
    """Get or create a session ID for circuit storage"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return session['session_id']

def store_circuit(circuit_qasm):
    """Store circuit in both session and backup storage"""
    session_id = get_session_id()
    session['current_circuit'] = circuit_qasm
    circuit_backup_storage[session_id] = circuit_qasm
    print(f"[STORAGE] Circuit stored for session {session_id[:8]}...")

def get_circuit():
    """Get circuit from session or backup storage"""
    # Try session first
    if 'current_circuit' in session:
        return session['current_circuit']
    
    # Try backup storage
    session_id = session.get('session_id')
    if session_id and session_id in circuit_backup_storage:
        circuit_qasm = circuit_backup_storage[session_id]
        session['current_circuit'] = circuit_qasm  # Restore to session
        print(f"[STORAGE] Circuit restored from backup for session {session_id[:8]}...")
        return circuit_qasm
    
    # Fallback: if there's only one circuit in backup storage, use it
    # This helps with session recovery during development
    if len(circuit_backup_storage) == 1:
        fallback_session_id, circuit_qasm = next(iter(circuit_backup_storage.items()))
        print(f"[STORAGE] Using fallback circuit from session {fallback_session_id[:8]}...")
        session['current_circuit'] = circuit_qasm
        session['session_id'] = fallback_session_id  # Update session ID
        return circuit_qasm
    
    return None

def has_circuit():
    """Check if circuit exists in session or backup"""
    return get_circuit() is not None

# Debug endpoint to check session status
@app.route('/api/session-debug', methods=['GET'])
def session_debug():
    """Debug endpoint to check session status"""
    try:
        session_id = log_session_info("session-debug")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'has_circuit': 'current_circuit' in session,
            'session_keys': list(session.keys()),
            'session_permanent': session.permanent,
            'cookie_secure': app.config.get('SESSION_COOKIE_SECURE'),
            'cookie_samesite': app.config.get('SESSION_COOKIE_SAMESITE'),
            'is_development': is_development,
            'cookies_received': dict(request.cookies),
            'backup_storage_sessions': list(circuit_backup_storage.keys()),
            'request_headers': dict(request.headers)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# New endpoint to force circuit restoration from backup
@app.route('/api/restore-session', methods=['POST'])
def restore_session():
    """Manually restore circuit from backup storage"""
    try:
        session_id = get_session_id()
        
        # Try to restore from backup
        if session_id in circuit_backup_storage:
            circuit_qasm = circuit_backup_storage[session_id]
            session['current_circuit'] = circuit_qasm
            print(f"[RESTORE] Circuit restored for session {session_id[:8]}...")
            
            return jsonify({
                'success': True,
                'message': 'Circuit restored from backup',
                'has_circuit': True,
                'session_id': session_id[:8] + '...'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No circuit found in backup storage',
                'available_sessions': list(circuit_backup_storage.keys())
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# New endpoint to associate with an existing session
@app.route('/api/associate-session', methods=['POST'])
def associate_session():
    """Associate current session with an existing circuit session"""
    try:
        data = request.get_json()
        target_session_id = data.get('session_id') if data else None
        
        # If no specific session ID provided, use the first available one
        if not target_session_id and circuit_backup_storage:
            target_session_id = next(iter(circuit_backup_storage.keys()))
        
        if target_session_id and target_session_id in circuit_backup_storage:
            circuit_qasm = circuit_backup_storage[target_session_id]
            session['current_circuit'] = circuit_qasm
            session['session_id'] = target_session_id
            
            print(f"[ASSOCIATE] Session associated with {target_session_id[:8]}...")
            
            return jsonify({
                'success': True,
                'message': f'Session associated with existing circuit',
                'session_id': target_session_id[:8] + '...',
                'has_circuit': True
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No circuits available for association',
                'available_sessions': list(circuit_backup_storage.keys())
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Browser-accessible diagnostic page
@app.route('/debug', methods=['GET'])
def debug_page():
    """Simple HTML page for browser-based debugging"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Qiskit Visualizer Debug</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
            .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            button { padding: 10px 15px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
            button:hover { background: #0056b3; }
            pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <h1>Qiskit Visualizer Debug Console</h1>
        <div id="status"></div>
        
        <h3>Actions:</h3>
        <button onclick="checkSession()">Check Session</button>
        <button onclick="checkCircuit()">Check Circuit Status</button>
        <button onclick="createTestCircuit()">Create Test Circuit</button>
        <button onclick="testOptimize()">Test Optimize</button>
        <button onclick="associateSession()">Associate with Existing Session</button>
        
        <div id="output"></div>
        
        <script>
            function log(message, type = 'info') {
                const output = document.getElementById('output');
                const div = document.createElement('div');
                div.className = 'status ' + type;
                div.innerHTML = '<strong>' + new Date().toLocaleTimeString() + ':</strong> ' + message;
                output.appendChild(div);
                output.scrollTop = output.scrollHeight;
            }
            
            async function apiCall(endpoint, options = {}) {
                try {
                    const response = await fetch(endpoint, {
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        ...options
                    });
                    const data = await response.json();
                    return { success: response.ok, data, status: response.status };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            async function checkSession() {
                log('Checking session status...', 'info');
                const result = await apiCall('/api/session-debug');
                if (result.success) {
                    log('Session Status: ' + JSON.stringify(result.data, null, 2), 'success');
                } else {
                    log('Session check failed: ' + (result.error || result.data?.error), 'error');
                }
            }
            
            async function checkCircuit() {
                log('Checking circuit status...', 'info');
                const result = await apiCall('/api/circuit-status');
                if (result.success) {
                    const hasCircuit = result.data.hasCircuit;
                    log('Circuit Status: ' + (hasCircuit ? 'FOUND' : 'NOT FOUND'), hasCircuit ? 'success' : 'error');
                    log('Details: ' + JSON.stringify(result.data, null, 2), 'info');
                } else {
                    log('Circuit check failed: ' + (result.error || result.data?.error), 'error');
                }
            }
            
            async function createTestCircuit() {
                log('Creating test circuit...', 'info');
                const result = await apiCall('/api/init-circuit', {
                    method: 'POST',
                    body: JSON.stringify({ num_qubits: 2 })
                });
                if (result.success) {
                    log('Circuit created successfully!', 'success');
                    // Add a gate
                    const gateResult = await apiCall('/api/add-gate', {
                        method: 'POST',
                        body: JSON.stringify({ gate: 'h', target: 0 })
                    });
                    if (gateResult.success) {
                        log('Added Hadamard gate to qubit 0', 'success');
                    }
                } else {
                    log('Circuit creation failed: ' + (result.error || result.data?.error), 'error');
                }
            }
            
            async function testOptimize() {
                log('Testing optimization...', 'info');
                const result = await apiCall('/api/optimize', {
                    method: 'POST',
                    body: JSON.stringify({ level: 2 })
                });
                if (result.success) {
                    log('Optimization successful!', 'success');
                    log('Results: ' + JSON.stringify(result.data, null, 2), 'info');
                } else {
                    log('Optimization failed: ' + (result.error || result.data?.error), 'error');
                    if (result.data?.debug_info) {
                        log('Debug info: ' + JSON.stringify(result.data.debug_info, null, 2), 'info');
                    }
                }
            }
            
            async function associateSession() {
                log('Attempting to associate with existing session...', 'info');
                const result = await apiCall('/api/associate-session', {
                    method: 'POST',
                    body: JSON.stringify({})
                });
                if (result.success) {
                    log('Session association: ' + result.data.message, 'success');
                } else {
                    log('Session association failed: ' + (result.error || result.data?.error), 'error');
                }
            }
            
            // Auto-check session on load
            window.onload = function() {
                log('Debug console loaded. Testing connection...', 'info');
                checkSession();
            };
        </script>
    </body>
    </html>
    """
    return html

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'qasm', 'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload-qasm', methods=['POST'])
def upload_qasm():
    try:
        # Clear any existing circuit
        circuit_qasm = get_circuit()
        if circuit_qasm:
            session_id = get_session_id()
            if session_id in circuit_backup_storage:
                del circuit_backup_storage[session_id]
            if 'current_circuit' in session:
                session.pop('current_circuit')
            
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400

        file = request.files['file']
        backend_name = request.headers.get('Backend', 'statevector_simulator')

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'}), 400

        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type'}), 400

        # Validate backend selection
        available_backends = Aer.backends()
        valid_backends = [str(b).split("'")[1] if "'" in str(b) else str(b) for b in available_backends]
        if backend_name not in valid_backends:
            return jsonify({
                'success': False,
                'error': f'Invalid backend. Available: {", ".join(valid_backends)}'
            }), 400

        temp_dir = tempfile.gettempdir()
        filename = f"qasm_{uuid.uuid4().hex}.qasm"
        filepath = os.path.join(temp_dir, filename)
        file.save(filepath)

        with open(filepath, 'r') as f:
            qasm_str = f.read()

        circuit = QuantumCircuit.from_qasm_str(qasm_str)
        backend = Aer.get_backend(backend_name)

        # Draw circuit first
        try:
            circuit_buf = io.BytesIO()
            fig = circuit.draw(output='mpl', style={'backgroundcolor': '#FFFFFF'})
            plt.savefig(circuit_buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
            plt.close(fig)
            circuit_buf.seek(0)
            circuit_image = base64.b64encode(circuit_buf.getvalue()).decode('utf-8')
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Circuit drawing failed: {str(e)}'
            }), 400

        # Execute based on backend type
        bloch_images = []
        if backend_name == 'statevector_simulator':
            try:
                result = backend.run(circuit).result()
                statevector = result.get_statevector();
                
                buf = io.BytesIO();
                fig = plot_bloch_multivector(statevector);
                plt.savefig(buf, format='png', bbox_inches='tight');
                plt.close(fig);
                buf.seek(0);
                bloch_image = base64.b64encode(buf.getvalue()).decode('utf-8');
                bloch_images = [bloch_image] * circuit.num_qubits;
            except Exception as e:
                bloch_images = [None] * circuit.num_qubits
        else:
            bloch_images = [None] * circuit.num_qubits

        os.remove(filepath)

        formatted_gates = []
        for instruction in circuit.data:
            gate = instruction.operation
            qubits = [circuit.find_bit(qubit).index for qubit in instruction.qubits]
            clbits = [circuit.find_bit(clbit).index for clbit in instruction.clbits] if hasattr(instruction, 'clbits') else []

            gate_info = {
                'name': gate.name,
                'qubits': qubits,
                'clbits': clbits,
                'params': gate.params
            }
            formatted_gates.append(gate_info)

        return jsonify({
            "success": True,
            "circuit_image": circuit_image,
            "num_qubits": circuit.num_qubits,
            "gates": [str(gate) for gate in formatted_gates],
            "bloch_spheres": bloch_images,
            "backend_used": backend_name
        })

    except Exception as e:
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/health', methods=['GET'])
def api_health_check():
    return health_check()

@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Check if Aer backends are available
        backends = Aer.backends()
        if not backends:
            return jsonify({
                'status': 'unhealthy',
                'error': 'No quantum backends available'
            }), 500
        
        # Include session information in health check
        session_info = {
            'has_session_cookie': 'qiskit_session' in request.cookies,
            'session_id': request.cookies.get('qiskit_session', 'None')[:20] + '...' if request.cookies.get('qiskit_session') else 'None',
            'has_circuit_in_session': 'current_circuit' in session,
            'session_keys': list(session.keys()),
            'session_permanent': session.permanent
        }
            
        return jsonify({
            'status': 'healthy',
            'backends': [str(b) for b in backends],
            'session_info': session_info,
            'config': {
                'cookie_secure': app.config.get('SESSION_COOKIE_SECURE'),
                'cookie_samesite': app.config.get('SESSION_COOKIE_SAMESITE'),
                'is_development': is_development
            }
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.route('/api/init-circuit', methods=['POST'])
def init_circuit():
    try:
        log_request_info("INIT-CIRCUIT")
        log_session_info("init-circuit START")
        
        if not request.is_json:
            debug_print("Request is not JSON", "ERROR")
            return jsonify({'success': False, 'error': 'Request must be JSON'}), 400

        num_qubits = int(request.json.get('num_qubits', 2))
        debug_print(f"Initializing circuit with {num_qubits} qubits", "INFO")

        if num_qubits < 1 or num_qubits > 10:
            debug_print(f"Invalid qubit count: {num_qubits}", "ERROR")
            return jsonify({
                'success': False,
                'error': 'Number of qubits must be between 1 and 10'
            }), 400

        circuit = QuantumCircuit(num_qubits)
        circuit_qasm = qasm_dumps(circuit)
        
        # Use our improved storage system
        store_circuit(circuit_qasm)
        
        debug_print(f"Circuit stored in session: {len(circuit_qasm)} chars", "SUCCESS")
        log_session_info("init-circuit AFTER STORING")

        # Create a single Bloch sphere image for all qubits in |0> state
        buf = io.BytesIO()
        fig = plot_bloch_multivector([1, 0])
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        bloch_image = base64.b64encode(buf.getvalue()).decode('utf-8')
        bloch_images = [bloch_image] * num_qubits
        debug_print(f"Generated {len(bloch_images)} Bloch sphere images", "SUCCESS")

        # Generate circuit diagram
        circuit_image = None
        try:
            from qiskit.visualization import circuit_drawer
            circuit_buf = io.BytesIO()
            
            # Create the circuit figure
            fig = circuit_drawer(circuit, output='mpl', style='iqx', fold=-1)
            if fig is not None:
                fig.savefig(circuit_buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
                plt.close(fig)
                circuit_buf.seek(0)
                circuit_image = base64.b64encode(circuit_buf.getvalue()).decode('utf-8')
                debug_print(f"Generated circuit image: {len(circuit_image)} chars", "SUCCESS")
            else:
                debug_print("Circuit drawer returned None", "WARNING")
        except Exception as e:
            debug_print(f"Failed to generate circuit image: {str(e)}", "WARNING")
            circuit_image = None

        response_data = {
            'success': True,
            'bloch_spheres': bloch_images,
            'circuit_image': circuit_image,
            'num_qubits': num_qubits,
            'gates': [],
            'session_debug': {
                'session_id': get_session_id()[:8] + '...',
                'has_circuit': has_circuit()
            }
        }
        
        debug_print("Circuit initialization completed successfully", "SUCCESS")
        return jsonify(response_data)
    except Exception as e:
        debug_print(f"Circuit initialization failed: {str(e)}", "ERROR")
        debug_print(traceback.format_exc(), "DEBUG")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/circuit-status', methods=['GET'])
def circuit_status():
    try:
        log_session_info("circuit-status")
        
        circuit_qasm = get_circuit()
        if circuit_qasm:
            circuit = QuantumCircuit.from_qasm_str(circuit_qasm)
            
            # Generate Bloch sphere images for the current circuit state
            bloch_images = []
            try:
                # Use statevector simulator to get current state
                backend = Aer.get_backend('statevector_simulator')
                result = backend.run(circuit).result()
                statevector = result.get_statevector()
                
                # Generate Bloch sphere visualization
                buf = io.BytesIO()
                fig = plot_bloch_multivector(statevector)
                plt.savefig(buf, format='png', bbox_inches='tight')
                plt.close(fig)
                buf.seek(0)
                bloch_image = base64.b64encode(buf.getvalue()).decode('utf-8')
                bloch_images = [bloch_image] * circuit.num_qubits
            except Exception as e:
                print(f"Bloch sphere generation failed: {str(e)}")
                bloch_images = []
            
            return jsonify({
                'success': True,
                'hasCircuit': True,
                'num_qubits': circuit.num_qubits,
                'gate_count': len(circuit.data),
                'circuit_depth': circuit.depth(),
                'bloch_images': bloch_images,
                'session_debug': {
                    'session_id': get_session_id()[:8] + '...',
                    'has_circuit': True,
                    'circuit_length': len(circuit_qasm),
                    'session_keys': list(session.keys()),
                    'cookies_received': dict(request.cookies)
                }
            })
        
        print("[SESSION DEBUG] No circuit found in session or backup")
        return jsonify({
            'success': True,
            'hasCircuit': False,
            'numQubits': 0,
            'gateCount': 0,
            'session_debug': {
                'session_id': get_session_id()[:8] + '...',
                'has_circuit': False,
                'session_keys': list(session.keys()),
                'cookies_received': dict(request.cookies),
                'backup_storage_keys': list(circuit_backup_storage.keys())
            }
        })
    except Exception as e:
        print(f"[SESSION DEBUG] Error in circuit-status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'session_debug': {
                'session_keys': list(session.keys()),
                'cookies_received': dict(request.cookies)
            }
        }), 500

@app.route('/api/add-gate', methods=['POST'])
def add_gate():
    try:
        circuit_qasm = get_circuit()
        if not circuit_qasm:
            return jsonify({
                'success': False,
                'error': 'No circuit initialized'
            }), 400

        data = request.json
        gate_type = data['gate']
        target = data['target']
        control = data.get('control')

        circuit = QuantumCircuit.from_qasm_str(circuit_qasm)

        if target >= circuit.num_qubits:
            return jsonify({
                'success': False,
                'error': f'Target qubit {target} out of range'
            }), 400

        if control is not None and control >= circuit.num_qubits:
            return jsonify({
                'success': False,
                'error': f'Control qubit {control} out of range'
            }), 400

        if gate_type == 'h':
            circuit.h(target)
        elif gate_type == 'x':
            circuit.x(target)
        elif gate_type == 'y':
            circuit.y(target)
        elif gate_type == 'z':
            circuit.z(target)
        elif gate_type == 'cx':
            if control is None:
                return jsonify({
                    'success': False,
                    'error': 'Control qubit required for CX gate'
                }), 400
            circuit.cx(control, target)
        elif gate_type == 'swap':
            if control is None:
                return jsonify({
                    'success': False,
                    'error': 'Control qubit required for SWAP gate'
                }), 400
            circuit.swap(control, target)
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown gate type: {gate_type}'
            }), 400

        # Store the updated circuit
        store_circuit(qasm_dumps(circuit))

        # Draw circuit
        circuit_image = None
        try:
            from qiskit.visualization import circuit_drawer
            buf = io.BytesIO()
            fig = circuit_drawer(circuit, output='mpl', style='iqx', fold=-1)
            if fig is not None:
                fig.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
                plt.close(fig)
                buf.seek(0)
                circuit_image = base64.b64encode(buf.getvalue()).decode('utf-8')
            else:
                debug_print("Circuit drawer returned None in add_gate", "WARNING")
        except Exception as e:
            debug_print(f"Failed to generate circuit image in add_gate: {str(e)}", "WARNING")

        # Get statevector and plot Bloch spheres
        backend = Aer.get_backend('statevector_simulator')
        state = backend.run(circuit).result().get_statevector();
        
        buf = io.BytesIO();
        fig = plot_bloch_multivector(state);
        plt.savefig(buf, format='png', bbox_inches='tight');
        plt.close(fig);
        buf.seek(0);
        bloch_image = base64.b64encode(buf.getvalue()).decode('utf-8');
        bloch_images = [bloch_image] * circuit.num_qubits;

        return jsonify({
            'success': True,
            'gates': [str(op) for op in circuit.data],
            'circuit_image': circuit_image,
            'bloch_spheres': bloch_images
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/run-simulation', methods=['POST'])
def run_simulation():
    try:
        circuit_qasm = get_circuit()
        if not circuit_qasm:
            return jsonify({
                'success': False,
                'error': 'No circuit loaded'
            }), 400

        shots = int(request.json.get('shots', 1024))
        if shots < 1 or shots > 10000:
            return jsonify({
                'success': False,
                'error': 'Shots must be between 1 and 10000'
            }), 400

        circuit = QuantumCircuit.from_qasm_str(circuit_qasm)
        measured_circuit = circuit.copy()
        measured_circuit.measure_all()

        simulator = Aer.get_backend('qasm_simulator')
        job = simulator.run(measured_circuit, shots=shots)
        result = job.result()
        counts = result.get_counts()

        buf = io.BytesIO()
        fig = plot_histogram(counts)
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        histogram = base64.b64encode(buf.getvalue()).decode('utf-8')

        return jsonify({
            'success': True,
            'counts': counts,
            'histogram_image': histogram
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/optimize', methods=['POST'])
def optimize_circuit():
    try:
        log_session_info("optimize-circuit START")
        
        circuit_qasm = get_circuit()
        if not circuit_qasm:
            print("[OPTIMIZE DEBUG] No circuit found in session or backup")
            print(f"[OPTIMIZE DEBUG] Session keys: {list(session.keys())}")
            print(f"[OPTIMIZE DEBUG] Backup storage keys: {list(circuit_backup_storage.keys())}")
            print(f"[OPTIMIZE DEBUG] Cookies: {dict(request.cookies)}")
            
            return jsonify({
                'success': False,
                'error': 'No circuit to optimize',
                'debug_info': {
                    'session_keys': list(session.keys()),
                    'backup_storage_keys': list(circuit_backup_storage.keys()),
                    'cookies_received': dict(request.cookies),
                    'session_id': get_session_id()[:8] + '...'
                }
            }), 400

        circuit = QuantumCircuit.from_qasm_str(circuit_qasm)
        level = int(request.json.get('level', 1))
        if level < 0 or level > 3:
            return jsonify({
                'success': False,
                'error': 'Optimization level must be between 0 and 3'
            }), 400

        print(f"[OPTIMIZE DEBUG] Optimizing circuit with {len(circuit.data)} gates at level {level}")
        optimized_circuit = transpile(circuit, optimization_level=level)

        original_img = io.BytesIO()
        circuit.draw('mpl').savefig(original_img, format='png')
        original_img.seek(0)

        optimized_img = io.BytesIO()
        optimized_circuit.draw('mpl').savefig(optimized_img, format='png')
        optimized_img.seek(0)

        return jsonify({
            'success': True,
            'original': {
                'gate_count': len(circuit.data),
                'depth': circuit.depth(),
                'circuit_image': base64.b64encode(original_img.getvalue()).decode('utf-8')
            },
            'optimized': {
                'gate_count': len(optimized_circuit.data),
                'depth': optimized_circuit.depth(),
                'circuit_image': base64.b64encode(optimized_img.getvalue()).decode('utf-8'),
                'optimization_steps': [
                    f"Reduced gates from {len(circuit.data)} to {len(optimized_circuit.data)}",
                    f"Reduced depth from {circuit.depth()} to {optimized_circuit.depth()}"
                ]
            }
        })
    except Exception as e:
        print(f"[OPTIMIZE DEBUG] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/noise-simulation', methods=["POST"])
def noise_simulation():
    try:
        circuit_qasm = get_circuit()
        if not circuit_qasm:
            return jsonify({
                'success': False,
                'error': 'No circuit loaded'
            }), 400

        data = request.json
        shots = int(data.get('shots', 1024))
        if shots < 1 or shots > 10000:
            return jsonify({
                'success': False,
                'error': 'Shots must be between 1 and 10000'
            }), 400

        noise_params = data.get('noise', {})
        depolarizing = min(max(float(noise_params.get('depolarizing', 0)), 0), 1.0)
        bit_flip = min(max(float(noise_params.get('bit_flip', 0)), 0), 1.0)
        phase_flip = min(max(float(noise_params.get('phase_flip', 0)), 0), 1.0)

        circuit = QuantumCircuit.from_qasm_str(circuit_qasm)
        measured_circuit = circuit.copy()
        measured_circuit.measure_all()

        noise_model = NoiseModel()
        
        # Single-qubit errors
        if depolarizing > 0:
            error_1q = depolarizing_error(depolarizing, 1)
            error_2q = depolarizing_error(depolarizing, 2)
            noise_model.add_all_qubit_quantum_error(error_1q, ['h', 'x', 'y', 'z'])
            noise_model.add_all_qubit_quantum_error(error_2q, ['cx', 'swap'])

        if bit_flip > 0:
            error = pauli_error([('X', bit_flip), ('I', 1-bit_flip)])
            noise_model.add_all_qubit_quantum_error(error, ['measure'])

        if phase_flip > 0:
            error = pauli_error([('Z', phase_flip), ('I', 1-phase_flip)])
            noise_model.add_all_qubit_quantum_error(error, ['measure'])

        simulator = Aer.get_backend('qasm_simulator')
        job = simulator.run(
            transpile(measured_circuit, simulator),
            shots=shots,
            noise_model=noise_model
        )
        result = job.result()
        counts = result.get_counts()

        buf = io.BytesIO()
        plot_histogram(counts).savefig(buf, format='png', bbox_inches='tight')
        histogram = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()

        fidelity = None
        if any([depolarizing, bit_flip, phase_flip]):
            ideal_backend = Aer.get_backend('statevector_simulator')
            ideal_state = ideal_backend.run(circuit).result().get_statevector()
            noisy_state = ideal_backend.run(circuit,
                noise_model=noise_model).result().get_statevector()
            fidelity = float(np.abs(np.dot(ideal_state.conj(), noisy_state))**2)

        return jsonify({
            'success': True,
            'counts': counts,
            'histogram_image': histogram,
            'fidelity': fidelity,
            'noise_parameters': {
                'depolarizing': depolarizing,
                'bit_flip': bit_flip,
                'phase_flip': phase_flip
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/challenges', methods=['GET'])
def get_challenges():
    return jsonify({
        'success': True,
        'challenges': CHALLENGES
    })

@app.route('/api/verify-challenge', methods=['POST'])
def verify_challenge():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        challenge_id = data.get('challenge_id')
        solution = data.get('solution', '').strip()
        
        if not challenge_id or not solution:
            return jsonify({
                'success': False,
                'error': 'Missing challenge_id or solution'
            }), 400

        challenge = next((c for c in CHALLENGES if c['id'] == int(challenge_id)), None)
        if not challenge:
            return jsonify({
                'success': False,
                'error': 'Invalid challenge ID'
            }), 404

        # Parse and build user's circuit
        try:
            user_circuit = QuantumCircuit(challenge['num_qubits'])
            gates = [g.strip() for g in solution.split(';') if g.strip()]
            
            for gate in gates:
                parts = gate.split()
                if len(parts) < 2:
                    raise ValueError(f"Invalid gate format: {gate}")
                
                gate_name = parts[0].upper()
                qubits = list(map(int, parts[1:]));
                
                if gate_name == 'H':
                    user_circuit.h(qubits[0])
                elif gate_name == 'X':
                    user_circuit.x(qubits[0])
                elif gate_name == 'Y':
                    user_circuit.y(qubits[0])
                elif gate_name == 'Z':
                    user_circuit.z(qubits[0])
                elif gate_name == 'CX' and len(qubits) >= 2:
                    user_circuit.cx(qubits[0], qubits[1])
                elif gate_name == 'SWAP' and len(qubits) >= 2:
                    user_circuit.swap(qubits[0], qubits[1])
                else:
                    raise ValueError(f"Unsupported gate: {gate_name}")
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Invalid circuit: {str(e)}',
                'hint': 'Use format like "H 0; CX 0 1"'
            }), 400

        # Generate circuit image
        try:
            buf = io.BytesIO()
            fig = user_circuit.draw('mpl')
            plt.savefig(buf, format='png', bbox_inches='tight')
            plt.close(fig)
            circuit_image = base64.b64encode(buf.getvalue()).decode('utf-8')
        except Exception as e:
            circuit_image = None

        # Build reference circuit
        ref_circuit = QuantumCircuit(challenge['num_qubits'])
        for gate in challenge['solution'].split(';'):
            gate = gate.strip()
            if not gate:
                continue
            parts = gate.split()
            gate_name = parts[0].upper()
            qubits = list(map(int, parts[1:]));
            
            if gate_name == 'H':
                ref_circuit.h(qubits[0])
            elif gate_name == 'X':
                ref_circuit.x(qubits[0])
            elif gate_name == 'CX':
                ref_circuit.cx(qubits[0], qubits[1])

        # Compare states
        backend = Aer.get_backend('statevector_simulator')
        user_state = backend.run(user_circuit).result().get_statevector()
        ref_state = backend.run(ref_circuit).result().get_statevector()
        
        # Calculate state fidelity
        fidelity = np.abs(np.dot(user_state.conj(), ref_state))**2
        is_correct = np.isclose(fidelity, 1.0, atol=1e-5)

        # Generate Bloch spheres
        bloch_images = [];
        for qubit in range(challenge['num_qubits']):
            try:
                traced_state = partial_trace(user_state, 
                                          [i for i in range(challenge['num_qubits']) if i != qubit])
                buf = io.BytesIO()
                fig = plot_bloch_multivector(traced_state)
                plt.savefig(buf, format='png', bbox_inches='tight')
                plt.close(fig)
                bloch_images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
            except Exception:
                bloch_images.append(None)

        # Get measurement counts
        measured_circuit = user_circuit.copy();
        measured_circuit.measure_all();
        simulator = Aer.get_backend('qasm_simulator');
        counts = simulator.run(measured_circuit, shots=1000).result().get_counts();

        return jsonify({
            'success': True,
            'correct': bool(is_correct),
            'fidelity': float(fidelity),
            'counts': counts,
            'circuit_image': circuit_image,
            'bloch_spheres': bloch_images,
            'hint': challenge['hint'] if not is_correct else ''
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Server error during verification',
            'details': str(e)
        }), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(port=5002, debug=True, host='0.0.0.0')
