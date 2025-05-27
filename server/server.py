from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({
        "service": "Quantum Circuit API",
        "status": "active",
        "endpoints": {
            "POST /init-circuit": "Initialize quantum circuit",
            "POST /run-circuit": "Execute quantum circuit"
        }
    })

@app.route('/init-circuit', methods=['POST'])
def init_circuit():
    num_qubits = request.json.get('num_qubits', 2)
    circ = QuantumCircuit(num_qubits)
    
    # Apply Hadamard gate to all qubits for superposition
    for qubit in range(num_qubits):
        circ.h(qubit)
    
    return jsonify({
        "success": True,
        "circuit": {
            "qubits": num_qubits,
            "operations": [f"H{q}" for q in range(num_qubits)],
            "depth": circ.depth(),
            "qasm": circ.qasm()
        }
    })

@app.route('/run-circuit', methods=['POST'])
def run_circuit():
    qasm_str = request.json.get('qasm')
    shots = request.json.get('shots', 1024)
    
    try:
        circ = QuantumCircuit.from_qasm_str(qasm_str)
        simulator = AerSimulator()
        compiled = transpile(circ, simulator)
        result = simulator.run(compiled, shots=shots).result()
        counts = result.get_counts()
        
        return jsonify({
            "success": True,
            "results": {
                "counts": counts,
                "shots": shots,
                "statevector": np.round(result.get_statevector(), 4).tolist()
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(port=5000, debug=True, host='0.0.0.0')
