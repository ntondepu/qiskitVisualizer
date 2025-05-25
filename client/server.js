from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Initialize circuit state
circuit = {
    'num_qubits': 2,
    'gates': []
}

@app.route('/init-circuit', methods=['POST'])
def init_circuit():
    data = request.get_json()
    num_qubits = data.get('num_qubits', 2)
    
    # Validate input
    if not isinstance(num_qubits, int) or num_qubits < 1:
        return jsonify({'success': False, 'error': 'Invalid number of qubits'})
    
    # Reset circuit
    circuit['num_qubits'] = num_qubits
    circuit['gates'] = []
    
    return jsonify({
        'success': True,
        'message': f'Initialized circuit with {num_qubits} qubits'
    })

@app.route('/add-gate', methods=['POST'])
def add_gate():
    data = request.get_json()
    gate_type = data.get('type', 'h')
    target = data.get('target', 0)
    control = data.get('control')
    
    # Validate
    if target < 0 or target >= circuit['num_qubits']:
        return jsonify({'success': False, 'error': 'Invalid target qubit'})
    
    # Add gate to circuit
    gate = {
        'type': gate_type,
        'target': target,
        'control': control
    }
    circuit['gates'].append(gate)
    
    return jsonify({
        'success': True,
        'circuit': {
            'gates': circuit['gates']
        },
        'visualization': {
            'bloch_spheres': [{'x': 0, 'y': 0, 'z': 1} for _ in range(circuit['num_qubits'])],
            'circuit_image': ''
        }
    })

@app.route('/run-simulation', methods=['POST'])
def run_simulation():
    # Mock simulation results
    return jsonify({
        'success': True,
        'results': {
            'counts': {'00': 512, '11': 512},
            'statevector': []
        }
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
