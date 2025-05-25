from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Add this root route for testing
@app.route('/')
def home():
    return jsonify({"message": "Quantum Backend Running", "status": "OK"})

@app.route('/init-circuit', methods=['POST'])
def init_circuit():
    num_qubits = request.json.get('num_qubits', 2)
    return jsonify({
        'success': True,
        'message': f'Initialized {num_qubits} qubits',
        'data': {
            'qubits': num_qubits,
            'state': '|0>' * num_qubits
        }
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)  # Added debug mode
