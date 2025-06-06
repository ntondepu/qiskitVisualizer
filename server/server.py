# server.py
import matplotlib
matplotlib.use('Agg')
from matplotlib import pyplot as plt
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile
from qiskit.visualization import plot_bloch_multivector, plot_histogram
from qiskit_aer import Aer
import base64
import io
import sys
import json

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = 'your-secret-key-here'  # Change this to a secure random key

@app.route('/api/upload-qasm', methods=['POST', 'OPTIONS'])
def upload_qasm():
    try:
        qasm_str = request.json.get('qasm')
        if not qasm_str:
            return jsonify({'success': False, 'error': 'No QASM provided'}), 400
        
        circuit = QuantumCircuit.from_qasm_str(qasm_str)
        session['current_circuit'] = qasm_str
        return jsonify({
            'success': True,
            'message': 'QASM loaded successfully',
            'num_qubits': circuit.num_qubits
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/init-circuit', methods=['POST'])
def init_circuit():
    try:
        num_qubits = int(request.json.get('num_qubits', 2))
        circuit = QuantumCircuit(num_qubits)
        session['current_circuit'] = circuit.qasm()
        
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
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/circuit-status', methods=['GET'])
def circuit_status():
    try:
        if 'current_circuit' in session:
            circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
            return jsonify({
                'success': True,
                'hasCircuit': True,
                'numQubits': circuit.num_qubits,
                'gateCount': len(circuit.data)
            })
        return jsonify({
            'success': True,
            'hasCircuit': False,
            'numQubits': 0,
            'gateCount': 0
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/add-gate', methods=['POST'])
def add_gate():
    try:
        if 'current_circuit' not in session:
            return jsonify({'success': False, 'error': 'No circuit initialized'}), 400
            
        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
        data = request.json
        gate_type = data['gate']
        target = data['target']
        control = data.get('control')
        
        # Apply the gate
        if gate_type == 'h':
            circuit.h(target)
        elif gate_type == 'x':
            circuit.x(target)
        elif gate_type == 'y':
            circuit.y(target)
        elif gate_type == 'z':
            circuit.z(target)
        elif gate_type == 'cx':
            circuit.cx(control, target)
        elif gate_type == 'swap':
            circuit.swap(control, target)
        
        session['current_circuit'] = circuit.qasm()
        
        # Generate visualizations
        buf = io.BytesIO()
        circuit.draw('mpl').savefig(buf, format='png')
        circuit_image = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()
        
        state = Aer.get_backend('statevector_simulator').run(circuit).result().get_statevector()
        bloch_images = []
        for i in range(circuit.num_qubits):
            buf = io.BytesIO()
            plot_bloch_multivector(state).savefig(buf, format='png')
            bloch_images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
            plt.close()
        
        return jsonify({
            'success': True,
            'gates': [str(op) for op in circuit.data],
            'circuit_image': circuit_image,
            'bloch_spheres': bloch_images
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/optimize', methods=['POST', 'OPTIONS'])
def optimize_circuit():
    # Handle OPTIONS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Handle POST request
    try:
        if 'current_circuit' not in session:
            return jsonify({'success': False, 'error': 'No circuit to optimize'}), 400
            
        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
        level = int(request.json.get('level', 1))
        
        optimized_circuit = transpile(circuit, optimization_level=level)
        
        # Generate visualizations
        original_img = io.BytesIO()
        circuit.draw('mpl').savefig(original_img, format='png')
        original_img.seek(0)
        
        optimized_img = io.BytesIO()
        optimized_circuit.draw('mpl').savefig(optimized_img, format='png')
        optimized_img.seek(0)
        
        response = jsonify({
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
        
        # Add CORS headers to the main response too
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        error_response = jsonify({'success': False, 'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        error_response.headers.add('Access-Control-Allow-Credentials', 'true')
        return error_response, 500

@app.route('/api/noise-simulation', methods=['POST', 'OPTIONS'])
def noise_simulation():
    # Handle OPTIONS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'success': True})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        if 'current_circuit' not in session:
            return jsonify({'success': False, 'error': 'No circuit loaded'}), 400

        data = request.json
        shots = int(data.get('shots', 1024))
        noise_params = data.get('noise', {})
        
        # Corrected parameter validation
        depolarizing = min(max(float(noise_params.get('depolarizing', 0)), 0), 1.0)
        bit_flip = min(max(float(noise_params.get('bit_flip', 0)), 0), 1.0)
        phase_flip = min(max(float(noise_params.get('phase_flip', 0)), 0), 1.0)

        # Rest of your implementation...
        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
        measured_circuit = circuit.copy()
        measured_circuit.measure_all()

        noise_model = NoiseModel()
        if depolarizing > 0:
            error = depolarizing_error(depolarizing, 1)
            noise_model.add_all_qubit_quantum_error(error, ['h', 'x', 'y', 'z', 'cx', 'swap'])
        if bit_flip > 0:
            error = pauli_error([('X', bit_flip), ('I', 1-bit_flip)])
            noise_model.add_all_qubit_quantum_error(error, ['measure'])
        if phase_flip > 0:
            error = pauli_error([('Z', phase_flip), ('I', 1-phase_flip)])
            noise_model.add_all_qubit_quantum_error(error, ['measure'])

        # Run noisy simulation
        result = Aer.get_backend('qasm_simulator').run(
            transpile(measured_circuit, Aer.get_backend('qasm_simulator')),
            shots=shots,
            noise_model=noise_model
        ).result()
        
        counts = result.get_counts()
        
        # Generate visualization
        buf = io.BytesIO()
        plot_histogram(counts).savefig(buf, format='png', bbox_inches='tight')
        histogram = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()
        
        # Calculate fidelity
        fidelity = None
        if any([depolarizing, bit_flip, phase_flip]):
            ideal_backend = Aer.get_backend('statevector_simulator')
            ideal_state = execute(circuit, ideal_backend).result().get_statevector()
            noisy_state = execute(circuit, ideal_backend, noise_model=noise_model).result().get_statevector()
            fidelity = float(np.abs(np.dot(ideal_state.conj(), noisy_state))**2)

        response = jsonify({
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
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True, host='0.0.0.0')
