import matplotlib
matplotlib.use('Agg')
from matplotlib import pyplot as plt
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from qiskit import QuantumCircuit, transpile, execute
from qiskit.visualization import plot_bloch_multivector, plot_histogram
from qiskit_aer import Aer
from qiskit_aer.noise import NoiseModel, depolarizing_error, pauli_error
import base64
import io
import numpy as np
import json
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = 'your-secret-key-here'  # Change to a real secret key in production
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'qasm', 'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _build_cors_preflight_response():
    response = jsonify({'success': True})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

def _add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB

@app.route('/api/upload-qasm', methods=['POST'])
def upload_qasm():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file type'}), 400

    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    # Generate unique temp filename
    temp_dir = tempfile.gettempdir()
    filename = f"qasm_{uuid.uuid4().hex}.qasm"
    filepath = os.path.join(temp_dir, filename)
    
    try:
        # Save file temporarily
        file.save(filepath)
        
        # Read and validate content
        with open(filepath, 'r') as f:
            qasm_str = f.read()
            
        if not qasm_str.strip():
            raise ValueError("Empty QASM file")
        
        # Process QASM file
        circuit = QuantumCircuit.from_qasm_str(qasm_str)
        if circuit.num_qubits == 0:
            raise ValueError("Circuit has no qubits")
        
        # Generate visualization
        buf = io.BytesIO()
        circuit.draw('mpl').savefig(buf, format='png')
        buf.seek(0)
        image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'circuit_image': image_base64,
            'num_qubits': circuit.num_qubits,
            'gates': [str(gate) for gate in circuit.data]
        })
        
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': f"Processing failed: {str(e)}"
        }), 400
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/api/init-circuit', methods=['POST', 'OPTIONS'])
def init_circuit():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        if not request.is_json:
            return _add_cors_headers(jsonify({'success': False, 'error': 'Request must be JSON'})), 400
            
        num_qubits = int(request.json.get('num_qubits', 2))
        if num_qubits < 1 or num_qubits > 10:
            return _add_cors_headers(jsonify({
                'success': False, 
                'error': 'Number of qubits must be between 1 and 10'
            })), 400
            
        circuit = QuantumCircuit(num_qubits)
        session['current_circuit'] = circuit.qasm()
        
        bloch_images = []
        for _ in range(num_qubits):
            buf = io.BytesIO()
            plot_bloch_multivector([1, 0]).savefig(buf, format='png')
            bloch_images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
            plt.close()
        
        return _add_cors_headers(jsonify({
            'success': True,
            'bloch_spheres': bloch_images,
            'num_qubits': num_qubits
        }))
    except Exception as e:
        return _add_cors_headers(jsonify({'success': False, 'error': str(e)})), 500

@app.route('/api/circuit-status', methods=['GET', 'OPTIONS'])
def circuit_status():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    try:
        if 'current_circuit' in session:
            circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
            return _add_cors_headers(jsonify({
                'success': True,
                'hasCircuit': True,
                'numQubits': circuit.num_qubits,
                'gateCount': len(circuit.data)
            }))
        return _add_cors_headers(jsonify({
            'success': True,
            'hasCircuit': False,
            'numQubits': 0,
            'gateCount': 0
        }))
    except Exception as e:
        return _add_cors_headers(jsonify({
            'success': False,
            'error': str(e)
        })), 500

@app.route('/api/add-gate', methods=['POST', 'OPTIONS'])
def add_gate():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        if 'current_circuit' not in session:
            return _add_cors_headers(jsonify({
                'success': False, 
                'error': 'No circuit initialized'
            })), 400
            
        data = request.json
        gate_type = data['gate']
        target = data['target']
        control = data.get('control')
        
        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
        
        # Validate qubit indices
        if target >= circuit.num_qubits:
            return _add_cors_headers(jsonify({
                'success': False,
                'error': f'Target qubit {target} out of range'
            })), 400
            
        if control is not None and control >= circuit.num_qubits:
            return _add_cors_headers(jsonify({
                'success': False,
                'error': f'Control qubit {control} out of range'
            })), 400
        
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
            if control is None:
                return _add_cors_headers(jsonify({
                    'success': False,
                    'error': 'Control qubit required for CX gate'
                })), 400
            circuit.cx(control, target)
        elif gate_type == 'swap':
            if control is None:
                return _add_cors_headers(jsonify({
                    'success': False,
                    'error': 'Control qubit required for SWAP gate'
                })), 400
            circuit.swap(control, target)
        else:
            return _add_cors_headers(jsonify({
                'success': False,
                'error': f'Unknown gate type: {gate_type}'
            })), 400
        
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
        
        return _add_cors_headers(jsonify({
            'success': True,
            'gates': [str(op) for op in circuit.data],
            'circuit_image': circuit_image,
            'bloch_spheres': bloch_images
        }))
    except Exception as e:
        return _add_cors_headers(jsonify({'success': False, 'error': str(e)})), 500

@app.route('/api/run-simulation', methods=['POST', 'OPTIONS'])
def run_simulation():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        if 'current_circuit' not in session:
            return _add_cors_headers(jsonify({
                'success': False, 
                'error': 'No circuit loaded'
            })), 400

        shots = int(request.json.get('shots', 1024))
        if shots < 1 or shots > 10000:
            return _add_cors_headers(jsonify({
                'success': False,
                'error': 'Shots must be between 1 and 10000'
            })), 400

        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
        measured_circuit = circuit.copy()
        measured_circuit.measure_all()
        
        simulator = Aer.get_backend('qasm_simulator')
        job = simulator.run(transpile(measured_circuit, simulator), shots=shots)
        result = job.result()
        counts = result.get_counts()
        
        buf = io.BytesIO()
        plot_histogram(counts).savefig(buf, format='png', bbox_inches='tight')
        histogram = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()
        
        return _add_cors_headers(jsonify({
            'success': True,
            'counts': counts,
            'histogram_image': histogram
        }))
    except Exception as e:
        return _add_cors_headers(jsonify({'success': False, 'error': str(e)})), 500

@app.route('/api/optimize', methods=['POST', 'OPTIONS'])
def optimize_circuit():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        if 'current_circuit' not in session:
            return _add_cors_headers(jsonify({
                'success': False, 
                'error': 'No circuit to optimize'
            })), 400
            
        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
        level = int(request.json.get('level', 1))
        if level < 0 or level > 3:
            return _add_cors_headers(jsonify({
                'success': False,
                'error': 'Optimization level must be between 0 and 3'
            })), 400
        
        optimized_circuit = transpile(circuit, optimization_level=level)
        
        # Generate visualizations
        original_img = io.BytesIO()
        circuit.draw('mpl').savefig(original_img, format='png')
        original_img.seek(0)
        
        optimized_img = io.BytesIO()
        optimized_circuit.draw('mpl').savefig(optimized_img, format='png')
        optimized_img.seek(0)
        
        return _add_cors_headers(jsonify({
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
        }))
    except Exception as e:
        return _add_cors_headers(jsonify({'success': False, 'error': str(e)})), 500

@app.route('/api/noise-simulation', methods=['POST', 'OPTIONS'])
def noise_simulation():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()

    try:
        if 'current_circuit' not in session:
            return _add_cors_headers(jsonify({
                'success': False, 
                'error': 'No circuit loaded'
            })), 400

        data = request.json
        shots = int(data.get('shots', 1024))
        if shots < 1 or shots > 10000:
            return _add_cors_headers(jsonify({
                'success': False,
                'error': 'Shots must be between 1 and 10000'
            })), 400

        noise_params = data.get('noise', {})
        
        # Parameter validation
        depolarizing = min(max(float(noise_params.get('depolarizing', 0)), 0), 1.0)
        bit_flip = min(max(float(noise_params.get('bit_flip', 0)), 0), 1.0)
        phase_flip = min(max(float(noise_params.get('phase_flip', 0)), 0), 1.0)

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

        # Run simulation
        simulator = Aer.get_backend('qasm_simulator')
        job = execute(
            transpile(measured_circuit, simulator),
            backend=simulator,
            shots=shots,
            noise_model=noise_model
        )
        result = job.result()
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

        return _add_cors_headers(jsonify({
            'success': True,
            'counts': counts,
            'histogram_image': histogram,
            'fidelity': fidelity,
            'noise_parameters': {
                'depolarizing': depolarizing,
                'bit_flip': bit_flip,
                'phase_flip': phase_flip
            }
        }))
    except Exception as e:
        return _add_cors_headers(jsonify({'success': False, 'error': str(e)})), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True, host='0.0.0.0')
