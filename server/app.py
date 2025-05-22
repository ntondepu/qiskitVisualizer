from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit, execute
from qiskit.providers.aer import Aer
from qiskit.quantum_info import partial_trace, DensityMatrix
import numpy as np
import base64
import os

# Initialize Flask app with CORS
app = Flask(__name__, static_folder='../client/dist')
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

@app.route('/api/upload-qasm', methods=['POST', 'OPTIONS'])
def upload_qasm():
    """Handle QASM file uploads and circuit simulation"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        # Validate request
        if not request.is_json:
            return _cors_response({'error': 'Request must be JSON'}, 400)
            
        data = request.get_json()
        if not data or 'qasm' not in data:
            return _cors_response({'error': 'Missing QASM content'}, 400)
            
        qasm_str = data['qasm']
        if not isinstance(qasm_str, str) or not qasm_str.strip().startswith("OPENQASM"):
            return _cors_response({'error': 'Invalid QASM format'}, 400)

        # Parse and visualize circuit
        qc = QuantumCircuit.from_qasm_str(qasm_str)
        circuit_img = _generate_circuit_image(qc)
        
        # Simulate based on measurement gates
        has_measurement = any(gate.operation.name == 'measure' for gate in qc.data)
        
        if has_measurement:
            backend = Aer.get_backend('qasm_simulator')
            result = execute(qc, backend, shots=1024).result()
            return _cors_response({
                'success': True,
                'circuit_image': circuit_img,
                'counts': result.get_counts(),
                'num_qubits': qc.num_qubits,
                'num_gates': qc.size(),
                'has_measurement': True
            })
        else:
            backend = Aer.get_backend('statevector_simulator')
            state_vector = execute(qc, backend).result().get_statevector()
            bloch_data = _calculate_bloch_vectors(state_vector, qc.num_qubits)
            
            return _cors_response({
                'success': True,
                'circuit_image': circuit_img,
                'bloch_vectors': bloch_data,
                'num_qubits': qc.num_qubits,
                'num_gates': qc.size(),
                'has_measurement': False
            })
            
    except Exception as e:
        return _cors_response({'error': str(e)}, 500)

def _generate_circuit_image(qc):
    """Generate base64 encoded circuit diagram"""
    fig, ax = plt.subplots(figsize=(12, 6))
    qc.draw(output='mpl', ax=ax, style='iqx')
    buf = BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    img_data = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_data

def _calculate_bloch_vectors(state_vector, num_qubits):
    """Calculate Bloch vectors for each qubit"""
    bloch_data = []
    for i in range(num_qubits):
        reduced_dm = partial_trace(state_vector, [j for j in range(num_qubits) if j != i])
        dm = DensityMatrix(reduced_dm)
        bloch_vec = _get_bloch_vector(dm)
        bloch_data.append(bloch_vec.tolist())
    return bloch_data

def _get_bloch_vector(rho):
    """Calculate normalized Bloch vector"""
    paulis = [
        np.array([[0, 1], [1, 0]]),
        np.array([[0, -1j], [1j, 0]]),
        np.array([[1, 0], [0, -1]])
    ]
    with np.errstate(divide='ignore', invalid='ignore'):
        bloch_vec = np.array([np.trace(rho.data @ p).real for p in paulis])
        bloch_vec = np.nan_to_num(bloch_vec)
        norm = np.linalg.norm(bloch_vec)
        return bloch_vec / norm if norm > 1e-8 else bloch_vec

def _build_cors_preflight_response():
    """Handle OPTIONS requests for CORS"""
    response = jsonify({'success': True})
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return response

def _cors_response(data, status_code=200):
    """Add CORS headers to JSON responses"""
    response = jsonify(data)
    response.status_code = status_code
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
    return response

# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
