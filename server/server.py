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
import tempfile
import numpy as np
import json
import os
import tempfile
import uuid
from werkzeug.utils import secure_filename
import traceback

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this in production

# Simplified CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "supports_credentials": True,
        "methods": ["GET", "POST", "OPTIONS"]
    },
    r"/health": {
        "origins": "*",
        "methods": ["GET"]
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

# Session configuration
app.config.update(
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=True,
    PERMANENT_SESSION_LIFETIME=86400
)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'qasm', 'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload-qasm', methods=['POST'])
def upload_qasm():
    try:
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
        valid_backends = [b.name() for b in available_backends]
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
            fig = circuit.draw('mpl')
            plt.savefig(circuit_buf, format='png', bbox_inches='tight')
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
                result = execute(circuit, backend).result()
                statevector = result.get_statevector()
                
                buf = io.BytesIO()
                fig = plot_bloch_multivector(statevector)
                plt.savefig(buf, format='png', bbox_inches='tight')
                plt.close(fig)
                buf.seek(0)
                bloch_image = base64.b64encode(buf.getvalue()).decode('utf-8')
                bloch_images = [bloch_image] * circuit.num_qubits
            except Exception as e:
                bloch_images = [None] * circuit.num_qubits
        else:
            bloch_images = [None] * circuit.num_qubits

        os.remove(filepath)

        formatted_gates = []
        for instruction in circuit.data:
            gate = instruction.operation
            qubits = [qubit.index for qubit in instruction.qubits]
            clbits = [clbit.index for clbit in instruction.clbits] if hasattr(instruction, 'clbits') else []

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
            
        return jsonify({
            'status': 'healthy',
            'backends': [b.name() for b in backends]
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.route('/api/init-circuit', methods=['POST'])
def init_circuit():
    try:
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Request must be JSON'}), 400

        num_qubits = int(request.json.get('num_qubits', 2))

        if num_qubits < 1 or num_qubits > 10:
            return jsonify({
                'success': False,
                'error': 'Number of qubits must be between 1 and 10'
            }), 400

        circuit = QuantumCircuit(num_qubits)
        session['current_circuit'] = circuit.qasm()

        # Create a single Bloch sphere image for all qubits in |0> state
        buf = io.BytesIO()
        fig = plot_bloch_multivector([1, 0])
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        bloch_image = base64.b64encode(buf.getvalue()).decode('utf-8')
        bloch_images = [bloch_image] * num_qubits

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

@app.route('/api/add-gate', methods=['POST'])
def add_gate():
    try:
        if 'current_circuit' not in session:
            return jsonify({
                'success': False,
                'error': 'No circuit initialized'
            }), 400

        data = request.json
        gate_type = data['gate']
        target = data['target']
        control = data.get('control')

        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])

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

        session['current_circuit'] = circuit.qasm()

        # Draw circuit
        buf = io.BytesIO()
        fig = circuit.draw('mpl')
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        circuit_image = base64.b64encode(buf.getvalue()).decode('utf-8')

        # Get statevector and plot Bloch spheres
        backend = Aer.get_backend('statevector_simulator')
        state = execute(circuit, backend).result().get_statevector()
        
        buf = io.BytesIO()
        fig = plot_bloch_multivector(state)
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        bloch_image = base64.b64encode(buf.getvalue()).decode('utf-8')
        bloch_images = [bloch_image] * circuit.num_qubits

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
        if 'current_circuit' not in session:
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

        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
        measured_circuit = circuit.copy()
        measured_circuit.measure_all()

        simulator = Aer.get_backend('qasm_simulator')
        job = execute(measured_circuit, simulator, shots=shots)
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
        if 'current_circuit' not in session:
            return jsonify({
                'success': False,
                'error': 'No circuit to optimize'
            }), 400

        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
        level = int(request.json.get('level', 1))
        if level < 0 or level > 3:
            return jsonify({
                'success': False,
                'error': 'Optimization level must be between 0 and 3'
            }), 400

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
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/noise-simulation', methods=["POST"])
def noise_simulation():
    try:
        if 'current_circuit' not in session:
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

        circuit = QuantumCircuit.from_qasm_str(session['current_circuit'])
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
        job = execute(
            transpile(measured_circuit, simulator),
            backend=simulator,
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
            ideal_state = execute(circuit, ideal_backend).result().get_statevector()
            noisy_state = execute(circuit, ideal_backend,
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

        challenge = next((c for c in CHALLENGES if c['id'] == challenge_id), None)
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
                qubits = list(map(int, parts[1:]))
                
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
            qubits = list(map(int, parts[1:]))
            
            if gate_name == 'H':
                ref_circuit.h(qubits[0])
            elif gate_name == 'X':
                ref_circuit.x(qubits[0])
            elif gate_name == 'CX':
                ref_circuit.cx(qubits[0], qubits[1])

        # Compare states
        backend = Aer.get_backend('statevector_simulator')
        user_state = execute(user_circuit, backend).result().get_statevector()
        ref_state = execute(ref_circuit, backend).result().get_statevector()
        
        # Calculate state fidelity
        fidelity = np.abs(np.dot(user_state.conj(), ref_state))**2
        is_correct = np.isclose(fidelity, 1.0, atol=1e-5)

        # Generate Bloch spheres
        bloch_images = []
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
        measured_circuit = user_circuit.copy()
        measured_circuit.measure_all()
        counts = execute(measured_circuit, 
                        Aer.get_backend('qasm_simulator'), 
                        shots=1000).result().get_counts()

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

if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.run(port=5001, debug=True, host='0.0.0.0')
