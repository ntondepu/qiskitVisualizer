from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit, transpile, execute
from qiskit.visualization import plot_bloch_vector
from qiskit.providers.aer import Aer
from qiskit.quantum_info import partial_trace, DensityMatrix
from qiskit.providers.aer.noise import NoiseModel, depolarizing_error, pauli_error
import numpy as np
import base64
import os

app = Flask(__name__, static_folder='../client/dist')
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

def get_bloch_vector(rho):
    """Calculate Bloch vector from density matrix with numerical stability checks"""
    paulis = [
        np.array([[0, 1], [1, 0]]),    # X
        np.array([[0, -1j], [1j, 0]]), # Y
        np.array([[1, 0], [0, -1]])    # Z
    ]
    
    with np.errstate(divide='ignore', invalid='ignore'):
        bloch_vec = np.array([np.trace(rho.data @ p).real for p in paulis])
        bloch_vec = np.nan_to_num(bloch_vec, nan=0.0, posinf=0.0, neginf=0.0)
        norm = np.linalg.norm(bloch_vec)
        if norm > 1e-8:
            bloch_vec = bloch_vec / norm
    return bloch_vec

@app.route('/api/upload-qasm', methods=['POST'])
def upload_qasm():
    """Handle QASM file upload and circuit simulation"""
    try:
        # Validate request
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.get_json()
        if not data or 'qasm' not in data:
            return jsonify({'error': 'Missing QASM content'}), 400
            
        qasm_str = data['qasm']
        if not isinstance(qasm_str, str) or not qasm_str.strip().startswith("OPENQASM"):
            return jsonify({'error': 'Invalid QASM format'}), 400

        # Parse circuit
        try:
            qc = QuantumCircuit.from_qasm_str(qasm_str)
        except Exception as e:
            return jsonify({'error': f'Circuit parsing failed: {str(e)}'}), 400

        # Generate circuit diagram
        try:
            fig, ax = plt.subplots(figsize=(12, 6))
            qc.draw(output='mpl', ax=ax, style='iqx')
            buf = BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
            buf.seek(0)
            circuit_img = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
        except Exception as e:
            return jsonify({'error': f'Circuit visualization failed: {str(e)}'}), 400

        # Simulate circuit
        try:
            has_measurement = any(gate.operation.name == 'measure' for gate in qc.data)
            
            if has_measurement:
                backend = Aer.get_backend('qasm_simulator')
                result = execute(qc, backend, shots=1024).result()
                counts = result.get_counts()
                
                return jsonify({
                    'success': True,
                    'circuit_image': circuit_img,
                    'counts': counts,
                    'num_qubits': qc.num_qubits,
                    'num_gates': qc.size(),
                    'has_measurement': True
                })
            else:
                backend = Aer.get_backend('statevector_simulator')
                result = execute(qc, backend).result()
                state_vector = result.get_statevector()
                
                bloch_data = []
                for i in range(qc.num_qubits):
                    reduced_dm = partial_trace(state_vector, [j for j in range(qc.num_qubits) if j != i])
                    dm = DensityMatrix(reduced_dm)
                    bloch_vec = get_bloch_vector(dm)
                    bloch_data.append(bloch_vec.tolist())
                
                return jsonify({
                    'success': True,
                    'circuit_image': circuit_img,
                    'bloch_vectors': bloch_data,
                    'num_qubits': qc.num_qubits,
                    'num_gates': qc.size(),
                    'has_measurement': False
                })
                
        except Exception as e:
            return jsonify({'error': f'Simulation failed: {str(e)}'}), 400
            
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/build-circuit', methods=['POST'])
def build_circuit():
    """Build circuit from gate sequence"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        num_qubits = data.get('num_qubits', 2)
        gates = data.get('gates', [])
        measure = data.get('measure', False)
        
        qc = QuantumCircuit(num_qubits, num_qubits if measure else 0)
        
        for gate in gates:
            if gate['type'] == 'H':
                qc.h(gate['target'])
            elif gate['type'] == 'X':
                qc.x(gate['target'])
            elif gate['type'] == 'Y':
                qc.y(gate['target'])
            elif gate['type'] == 'Z':
                qc.z(gate['target'])
            elif gate['type'] == 'CX' and 'control' in gate:
                qc.cx(gate['control'], gate['target'])
            elif gate['type'] == 'SWAP' and 'control' in gate:
                qc.swap(gate['control'], gate['target'])
        
        if measure:
            qc.measure_all()
        
        return jsonify({
            'success': True,
            'qasm': qc.qasm(),
            'num_qubits': qc.num_qubits,
            'num_gates': qc.size()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve React frontend"""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
