from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/init-circuit', methods=['POST'])
def init_circuit():
    data = request.get_json()
    num_qubits = data.get('num_qubits', 2)
    return jsonify({
        'success': True,
        'message': f'Initialized {num_qubits} qubits'
    })

if __name__ == '__main__':
    app.run(port=5000)
