# server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit.visualization import plot_bloch_multivector, plot_histogram
from qiskit_aer import AerSimulator
import matplotlib.pyplot as plt
import base64
import io

app = Flask(__name__)
CORS(app)

current_circuit = None

@app.route('/init-circuit', methods=['POST'])
def init_circuit():
    global current_circuit
    num_qubits = request.json.get('num_qubits', 2)
    current_circuit = QuantumCircuit(num_qubits)
    
    # Initialize Bloch spheres
    bloch_images = []
    for _ in range(num_qubits):
        buf = io.BytesIO()
        plot_bloch_multivector([1, 0]).savefig(buf, format='png')
        bloch_images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        plt.close()
    
    return jsonify({
        'success': True,
        'bloch_spheres': bloch_images
    })

@app.route('/add-gate', methods=['POST'])
def add_gate():
    global current_circuit
    data = request.json
    gate_type = data['gate']
    target = data['target']
    control = data.get('control')
    
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
    
    # Generate visualizations
    buf = io.BytesIO()
    current_circuit.draw('mpl').savefig(buf, format='png')
    circuit_image = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close()
    
    # Update Bloch spheres
    simulator = AerSimulator()
    state = simulator.run(current_circuit).result().get_statevector()
    bloch_images = []
    for i in range(current_circuit.num_qubits):
        buf = io.BytesIO()
        plot_bloch_multivector(state, i).savefig(buf, format='png')
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
    
    simulator = AerSimulator()
    compiled_circuit = transpile(current_circuit, simulator)
    job = simulator.run(compiled_circuit, shots=shots)
    result = job.result()
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
    app.run(port=5000, debug=True)
