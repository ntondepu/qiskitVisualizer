from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit, execute, transpile
from qiskit.providers.aer import Aer
from qiskit.quantum_info import partial_trace, DensityMatrix, Statevector
from qiskit.visualization import plot_bloch_multivector, plot_histogram
from qiskit.providers.aer.noise import NoiseModel, depolarizing_error, pauli_error
import numpy as np
import base64
import os
import socket
import json
from datetime import datetime

# Initialize Flask app
app = Flask(__name__, static_folder='../client/dist')

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Disposition"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Global variables for circuit state
current_circuit = None
circuit_history = []
challenges_db = {
    1: {
        'name': 'Create Bell State',
        'description': 'Construct a circuit that creates an entangled Bell state between qubits 0 and 1',
        'solution': 'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\nh q[0];\ncx q[0],q[1];',
        'expected': {'00': 500, '11': 500}
    },
    2: {
        'name': 'GHZ State',
        'description': 'Create a 3-qubit GHZ state (|000⟩ + |111⟩)/√2',
        'solution': 'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[3];\nh q[0];\ncx q[0],q[1];\ncx q[0],q[2];',
        'expected': {'000': 500, '111': 500}
    }
}

def find_available_port(start=5001, end=5050):
    """Find an available port in range"""
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except OSError:
                continue
    raise OSError("No available ports")

def initialize_circuit(num_qubits):
    """Initialize a new quantum circuit"""
    global current_circuit, circuit_history
    current_circuit = {
        'qc': QuantumCircuit(num_qubits),
        'num_qubits': num_qubits,
        'gates': [],
        'measurements': False,
        'created_at': datetime.now().isoformat()
    }
    circuit_history.append(current_circuit.copy())
    return current_circuit

def add_gate(gate_type, target, control=None):
    """Add a gate to the current circuit"""
    global current_circuit
    if current_circuit is None:
        raise ValueError("No circuit initialized")
    
    gate_info = {
        'type': gate_type,
        'target': target,
        'control': control,
        'timestamp': datetime.now().isoformat()
    }
    
    # Apply gate to quantum circuit
    qc = current_circuit['qc']
    if gate_type == 'h':
        qc.h(target)
    elif gate_type == 'x':
        qc.x(target)
    elif gate_type == 'y':
        qc.y(target)
    elif gate_type == 'z':
        qc.z(target)
    elif gate_type == 'cx' and control is not None:
        qc.cx(control, target)
    elif gate_type == 'swap' and control is not None:
        qc.swap(control, target)
    
    current_circuit['gates'].append(gate_info)
    circuit_history.append(current_circuit.copy())
    return current_circuit

def add_measurement():
    """Add measurement to all qubits"""
    global current_circuit
    if current_circuit is None:
        raise ValueError("No circuit initialized")
    
    num_qubits = current_circuit['num_qubits']
    current_circuit['qc'].measure_all()
    current_circuit['measurements'] = True
    circuit_history.append(current_circuit.copy())
    return current_circuit

def generate_circuit_image(qc):
    """Generate base64 encoded circuit diagram"""
    fig, ax = plt.subplots(figsize=(12, max(4, qc.num_qubits)))
    qc.draw(output='mpl', ax=ax, style='iqx', plot_barriers=False)
    buf = BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    img_data = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_data

def calculate_bloch_vectors(qc):
    """Calculate Bloch vectors for each qubit"""
    backend = Aer.get_backend('statevector_simulator')
    state_vector = execute(qc, backend).result().get_statevector()
    
    bloch_images = []
    for qubit in range(qc.num_qubits):
        fig = plot_bloch_multivector(Statevector(state_vector).reduce([qubit]))
        buf = BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        bloch_images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        plt.close(fig)
    
    return bloch_images

def run_simulation(qc, shots=1024, noise_config=None):
    """Run quantum simulation with optional noise"""
    backend = Aer.get_backend('qasm_simulator')
    
    # Configure noise model if specified
    noise_model = None
    if noise_config:
        noise_model = NoiseModel()
        if 'depolarizing' in noise_config:
            error = depolarizing_error(noise_config['depolarizing'], 1)
            noise_model.add_all_qubit_quantum_error(error, ['h', 'x', 'cx', 'z', 'y'])
        if 'bit_flip' in noise_config:
            error = pauli_error([('X', noise_config['bit_flip']), ('I', 1 - noise_config['bit_flip'])])
            noise_model.add_all_qubit_quantum_error(error, ['measure'])
        if 'phase_flip' in noise_config:
            error = pauli_error([('Z', noise_config['phase_flip']), ('I', 1 - noise_config['phase_flip'])])
            noise_model.add_all_qubit_quantum_error(error, ['measure'])
    
    # Execute simulation
    result = execute(qc, backend, shots=shots, noise_model=noise_model).result()
    counts = result.get_counts()
    
    # Calculate fidelity if noise is applied
    fidelity = None
    if noise_model:
        ideal_backend = Aer.get_backend('statevector_simulator')
        ideal_state = execute(qc, ideal_backend).result().get_statevector()
        noisy_state = execute(qc, ideal_backend, noise_model=noise_model).result().get_statevector()
        fidelity = np.abs(np.dot(ideal_state.conj(), noisy_state))**2
    
    # Generate histogram
    fig = plot_histogram(counts)
    buf = BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    hist_img = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    
    return {
        'counts': counts,
        'histogram': hist_img,
        'fidelity': fidelity
    }

def verify_challenge_solution(qasm_str, expected_counts):
    """Verify if a solution matches expected results"""
    try:
        qc = QuantumCircuit.from_qasm_str(qasm_str)
        backend = Aer.get_backend('qasm_simulator')
        result = execute(qc, backend, shots=1024).result()
        actual_counts = result.get_counts()
        
        # Simple verification - could be more sophisticated
        return actual_counts.keys() == expected_counts.keys()
    except Exception:
        return False

@app.route('/api/init-circuit', methods=['POST', 'OPTIONS'])
def init_circuit():
    """Initialize a new quantum circuit"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.get_json()
        num_qubits = int(data.get('num_qubits', 4))
        circuit = initialize_circuit(num_qubits)
        return jsonify({
            'success': True,
            'circuit': circuit,
            'message': f'Initialized circuit with {num_qubits} qubits'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/add-gate', methods=['POST', 'OPTIONS'])
def api_add_gate():
    """Add a gate to the current circuit"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.get_json()
        gate_type = data['type']
        target = data['target']
        control = data.get('control')
        
        circuit = add_gate(gate_type, target, control)
        qc = circuit['qc']
        
        # Generate visualization data
        circuit_img = generate_circuit_image(qc)
        bloch_images = calculate_bloch_vectors(qc)
        
        return jsonify({
            'success': True,
            'circuit': circuit,
            'visualization': {
                'circuit_image': circuit_img,
                'bloch_spheres': bloch_images
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/run-simulation', methods=['POST', 'OPTIONS'])
def api_run_simulation():
    """Run the current circuit simulation"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.get_json()
        shots = int(data.get('shots', 1024))
        noise_config = data.get('noise', None)
        
        if current_circuit is None:
            raise ValueError("No circuit initialized")
        
        # Add measurements if not already present
        if not current_circuit['measurements']:
            add_measurement()
        
        # Run simulation
        qc = current_circuit['qc']
        results = run_simulation(qc, shots, noise_config)
        
        return jsonify({
            'success': True,
            'results': results,
            'circuit_image': generate_circuit_image(qc)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/optimize', methods=['POST', 'OPTIONS'])
def optimize_circuit():
    """Optimize the current quantum circuit"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.get_json()
        level = data.get('level', 1)
        
        if current_circuit is None:
            raise ValueError("No circuit to optimize")
        
        qc = current_circuit['qc']
        optimized = transpile(qc, optimization_level=level)
        
        return jsonify({
            'original': {
                'gate_count': len(qc.data),
                'depth': qc.depth(),
                'circuit_image': generate_circuit_image(qc)
            },
            'optimized': {
                'gate_count': len(optimized.data),
                'depth': optimized.depth(),
                'circuit_image': generate_circuit_image(optimized),
                'optimization_steps': get_optimization_steps(qc, optimized)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_optimization_steps(original, optimized):
    """Generate human-readable optimization steps"""
    steps = []
    if len(original.data) > len(optimized.data):
        steps.append(f"Reduced gates from {len(original.data)} to {len(optimized.data)}")
    if original.depth() > optimized.depth():
        steps.append(f"Reduced depth from {original.depth()} to {optimized.depth()}")
    return steps or ["No optimizations could be applied"]

@app.route('/api/verify-challenge', methods=['POST', 'OPTIONS'])
def verify_challenge():
    """Verify a challenge solution"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.get_json()
        challenge_id = data['challengeId']
        qasm_str = data['solution']
        
        challenge = challenges_db.get(int(challenge_id))
        if not challenge:
            raise ValueError("Challenge not found")
        
        qc = QuantumCircuit.from_qasm_str(qasm_str)
        is_correct = verify_challenge_solution(qasm_str, challenge['expected'])
        
        return jsonify({
            'success': is_correct,
            'counts': run_simulation(qc)['counts'],
            'hint': '' if is_correct else 'Try again! Check the expected output pattern.',
            'circuit_image': generate_circuit_image(qc),
            'bloch_spheres': calculate_bloch_vectors(qc)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/circuit-history', methods=['GET'])
def get_circuit_history():
    """Get the history of circuit states"""
    return jsonify({
        'success': True,
        'history': circuit_history
    })

@app.route('/api/get-challenges', methods=['GET'])
def get_challenges():
    """Get list of available challenges"""
    return jsonify({
        'success': True,
        'challenges': [
            {'id': k, 'name': v['name'], 'description': v['description']} 
            for k, v in challenges_db.items()
        ]
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve the frontend"""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

def _build_cors_preflight_response():
    """Handle OPTIONS requests"""
    response = jsonify({'success': True})
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return response

if __name__ == '__main__':
    port = find_available_port()
    print(f"Quantum Circuit Builder API running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
