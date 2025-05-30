# server.py
import matplotlib
matplotlib.use('Agg')  # Set non-interactive backend before other imports
from matplotlib import pyplot as plt

print(f"CONFIRMED: Matplotlib using {matplotlib.get_backend()} backend")

from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit.visualization import plot_bloch_multivector, plot_histogram
from qiskit_aer import Aer
import base64
import io
import sys

app = Flask(__name__)
CORS(app)

current_circuit = None

@app.route('/api/upload-qasm', methods=['POST', 'OPTIONS'])
def upload_qasm():
    try:
        qasm_str = request.json.get('qasm')
        if not qasm_str:
            return jsonify({'success': False, 'error': 'No QASM provided'}), 400
        
        # Load QASM into a QuantumCircuit
        from qiskit import QuantumCircuit
        circuit = QuantumCircuit.from_qasm_str(qasm_str)
        global current_circuit
        current_circuit = circuit
        
        return jsonify({
            'success': True,
            'message': 'QASM loaded successfully',
            'num_qubits': circuit.num_qubits
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/init-circuit', methods=['POST'])
def init_circuit():
    global current_circuit
    num_qubits = request.json.get('num_qubits', 2)
    current_circuit = QuantumCircuit(num_qubits)
    
    # Initialize Bloch spheres (all qubits in |0> state)
    bloch_images = []
    for _ in range(num_qubits):
        buf = io.BytesIO()
        plot_bloch_multivector([1, 0]).savefig(buf, format='png')
        bloch_images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        plt.close()
    
    return jsonify({
        'success': True,
        'bloch_spheres': bloch_images,
        'num_qubits': num_qubits
    })

@app.route('/add-gate', methods=['POST'])
def add_gate():
    global current_circuit
    data = request.json
    gate_type = data['gate']
    target = data['target']
    control = data.get('control')
    
    # Apply the gate
    if gate_type == 'h':
        current_circuit.h(target)
    elif gate_type == 'x':
        current_circuit.x(target)
    elif gate_type == 'y':
        current_circuit.y(target)
    elif gate_type == 'z':
        current_circuit.z(target)
    elif gate_type == 'cx':
        current_circuit.cx(control, target)
    elif gate_type == 'swap':
        current_circuit.swap(control, target)
    
    # Generate circuit diagram
    buf = io.BytesIO()
    current_circuit.draw('mpl').savefig(buf, format='png')
    circuit_image = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close()
    
    # Update Bloch spheres using statevector simulator
    simulator = Aer.get_backend('statevector_simulator')
    state = simulator.run(current_circuit).result().get_statevector()
    
    bloch_images = []
    for i in range(current_circuit.num_qubits):
        buf = io.BytesIO()
        plot_bloch_multivector(state).savefig(buf, format='png')  # Shows all qubits
        bloch_images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        plt.close()
    
    return jsonify({
        'success': True,
        'gates': [str(op) for op in current_circuit.data],
        'circuit_image': circuit_image,
        'bloch_spheres': bloch_images
    })

@app.route('/run-simulation', methods=['POST'])
def run_simulation():
    global current_circuit
    shots = request.json.get('shots', 1024)
    
    # Create a copy of the circuit with measurements
    measured_circuit = current_circuit.copy()
    measured_circuit.measure_all()  # Add measurements for all qubits
    
    # Run on qasm simulator
    simulator = Aer.get_backend('qasm_simulator')
    compiled_circuit = transpile(measured_circuit, simulator)
    result = simulator.run(compiled_circuit, shots=shots).result()
    counts = result.get_counts()
    
    # Generate histogram
    buf = io.BytesIO()
    plot_histogram(counts).savefig(buf, format='png')
    histogram = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close()
    
    return jsonify({
        'success': True,
        'counts': counts,
        'histogram_image': histogram
    })

if __name__ == '__main__':
    app.run(port=5001, debug=True, host='0.0.0.0')
