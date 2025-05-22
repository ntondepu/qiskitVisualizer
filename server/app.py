from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from qiskit import QuantumCircuit, transpile
from qiskit.visualization import plot_bloch_vector
from qiskit.providers.aer import Aer
from qiskit.quantum_info import partial_trace, DensityMatrix
from qiskit.providers.aer.noise import NoiseModel, depolarizing_error, pauli_error
import numpy as np
import base64
import os

app = Flask(__name__, static_folder='../client/dist')
CORS(app)

# Helper functions
def get_bloch_vector(rho):
    paulis = [
        np.array([[0, 1], [1, 0]]),
        np.array([[0, -1j], [1j, 0]]),
        np.array([[1, 0], [0, -1]])
    ]
    with np.errstate(divide='ignore', invalid='ignore'):
        bloch_vec = np.array([np.trace(rho.data @ p).real for p in paulis])
        bloch_vec = np.nan_to_num(bloch_vec, nan=0.0, posinf=0.0, neginf=0.0)
        norm = np.linalg.norm(bloch_vec)
        if norm > 1e-8:
            bloch_vec = bloch_vec / norm
    return bloch_vec

# API Endpoints
@app.route('/api/upload-qasm', methods=['POST'])
def upload_qasm():
    try:
        qasm_str = request.json.get('qasm')
        qc = QuantumCircuit.from_qasm_str(qasm_str)
        
        # Generate circuit diagram
        fig, ax = plt.subplots()
        qc.draw(output='mpl', ax=ax)
        buf = BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        circuit_img = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Simulate
        if any(gate.operation.name == 'measure' for gate in qc.data):
            backend = Aer.get_backend('qasm_simulator')
            result = execute(qc, backend, shots=1024).result()
            counts = result.get_counts()
            return jsonify({
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
                'circuit_image': circuit_img,
                'bloch_vectors': bloch_data,
                'num_qubits': qc.num_qubits,
                'num_gates': qc.size(),
                'has_measurement': False
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/build-circuit', methods=['POST'])
def build_circuit():
    data = request.json
    try:
        num_qubits = data['num_qubits']
        gates = data['gates']
        measure = data.get('measure', False)
        
        qc = QuantumCircuit(num_qubits, num_qubits if measure else 0)
        
        for gate in gates:
            if gate['type'] == 'H':
                qc.h(gate['target'])
            elif gate['type'] == 'X':
                qc.x(gate['target'])
            # Add other gate types...
        
        if measure:
            qc.measure_all()
        
        # Generate response (similar to upload_qasm)
        return jsonify({'qasm': qc.qasm()})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
