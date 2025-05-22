import matplotlib
matplotlib.use('Agg')
from fastapi import FastAPI, Request, Response, Form
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from qiskit import QuantumCircuit, transpile
from qiskit import execute
from qiskit.providers.aer import Aer
from qiskit.visualization import plot_bloch_vector, plot_histogram
from qiskit.quantum_info import partial_trace, DensityMatrix
from qiskit.providers.aer.noise import NoiseModel, depolarizing_error, pauli_error
import numpy as np
import matplotlib.pyplot as plt
import io
import warnings
import json
import base64
from typing import Optional

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

warnings.filterwarnings('ignore', category=RuntimeWarning)
np.seterr(all='ignore')

# Global variable to store circuit state
current_circuit = None

def get_bloch_vector(rho):
    paulis = [
        np.array([[0, 1], [1, 0]]),
        np.array([[0, -1j], [1j, 0]]),
        np.array([[1, 0], [0, -1]])
    ]
    try:
        with np.errstate(divide='ignore', invalid='ignore'):
            bloch_vec = np.array([np.trace(rho.data @ p).real for p in paulis])
            bloch_vec = np.nan_to_num(bloch_vec, nan=0.0, posinf=0.0, neginf=0.0)
            norm = np.linalg.norm(bloch_vec)
            if norm > 1e-8:
                bloch_vec = bloch_vec / norm
        return bloch_vec
    except Exception:
        return np.zeros(3)

def is_valid_state(state_vector):
    if state_vector is None:
        return False
    if np.any(np.isnan(state_vector)) or np.any(np.isinf(state_vector)):
        return False
    if np.allclose(state_vector, np.zeros_like(state_vector)):
        return False
    return True

def explain_gate(gate, target, control=None):
    explanations = {
        "H": f"H on q[{target}] → Creates superposition.",
        "X": f"X on q[{target}] → Flips the qubit (|0⟩ ↔ |1⟩).",
        "Y": f"Y on q[{target}] → Applies a Y-rotation.",
        "Z": f"Z on q[{target}] → Applies a Z phase flip.",
        "CX": f"CX from q[{control}] to q[{target}] → Entangles qubits.",
        "SWAP": f"SWAP between q[{control}] and q[{target}] → Swaps their states."
    }
    return explanations.get(gate, "")

def has_measurement(circuit):
    return any(inst.operation.name == 'measure' for inst in circuit.data)

@app.get("/", response_class=HTMLResponse)
async def home():
    return """
    <html>
        <head>
            <title>Quantum Learning Platform</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
                .tab { display: none; }
                .active { display: block; }
                .tab-buttons { display: flex; margin-bottom: 20px; }
                .tab-button { padding: 10px 20px; cursor: pointer; background: #eee; border: none; }
                .tab-button.active { background: #ddd; }
                .visualization { margin: 20px 0; }
                .sidebar { width: 250px; float: left; }
                .main-content { margin-left: 270px; }
                .gate-control { margin-bottom: 10px; }
                .columns { display: flex; }
                .column { flex: 1; margin: 5px; }
            </style>
        </head>
        <body>
            <h1>Quantum Learning Platform</h1>
            
            <div class="tab-buttons">
                <button class="tab-button" onclick="openTab('upload')">Upload QASM</button>
                <button class="tab-button" onclick="openTab('build')">Build Circuit</button>
                <button class="tab-button" onclick="openTab('optimize')">Optimize</button>
                <button class="tab-button" onclick="openTab('noise')">Noise Simulation</button>
                <button class="tab-button" onclick="openTab('challenge')">Challenge Mode</button>
            </div>
            
            <div id="upload" class="tab">
                <h2>Upload QASM File</h2>
                <input type="file" id="qasmFile">
                <button onclick="uploadQASM()">Upload</button>
                <div id="uploadResults"></div>
            </div>
            
            <div id="build" class="tab">
                <div class="sidebar">
                    <h3>Circuit Builder</h3>
                    <div>
                        <label>Number of Qubits:</label>
                        <input type="number" id="numQubits" min="1" max="5" value="2">
                    </div>
                    <h4>Add Gates</h4>
                    <div id="gateControls"></div>
                    <div>
                        <input type="checkbox" id="addMeasurement">
                        <label for="addMeasurement">Add Measurement</label>
                    </div>
                    <button onclick="generateCircuit()">Generate Circuit</button>
                </div>
                <div class="main-content">
                    <h2>Generated Circuit</h2>
                    <div id="circuitDiagram"></div>
                    <h3>Step-by-Step Explanation</h3>
                    <div id="explanations"></div>
                    <div id="blochSpheres"></div>
                </div>
            </div>
            
            <div id="optimize" class="tab">
                <h2>Optimized Circuit</h2>
                <div id="optimizedCircuit"></div>
            </div>
            
            <div id="noise" class="tab">
                <h2>Simulate Quantum Noise</h2>
                <div>
                    <input type="checkbox" id="bitFlipNoise">
                    <label for="bitFlipNoise">Add Bit-flip Noise</label>
                </div>
                <div>
                    <input type="checkbox" id="depolarizingNoise">
                    <label for="depolarizingNoise">Add Depolarizing Noise</label>
                </div>
                <div>
                    <input type="checkbox" id="measurementError">
                    <label for="measurementError">Add Measurement Error</label>
                </div>
                <button onclick="simulateNoise()">Simulate Noise</button>
                <div id="noiseResults"></div>
            </div>
            
            <div id="challenge" class="tab">
                <h2>Quantum Challenge Mode</h2>
                <select id="challengeSelect">
                    <option value="bell">Create a Bell State</option>
                    <option value="flip">Flip qubit with one gate</option>
                </select>
                <button onclick="runChallenge()">Run My Circuit</button>
                <div id="challengeResults"></div>
            </div>
            
            <script>
                // Tab management
                function openTab(tabName) {
                    const tabs = document.getElementsByClassName('tab');
                    for (let tab of tabs) {
                        tab.classList.remove('active');
                    }
                    document.getElementById(tabName).classList.add('active');
                    
                    const buttons = document.getElementsByClassName('tab-button');
                    for (let btn of buttons) {
                        btn.classList.remove('active');
                    }
                    event.currentTarget.classList.add('active');
                }
                
                // Initialize gate controls
                function initGateControls() {
                    const gateControls = document.getElementById('gateControls');
                    gateControls.innerHTML = '';
                    
                    for (let i = 0; i < 15; i++) {
                        const div = document.createElement('div');
                        div.className = 'gate-control';
                        div.innerHTML = `
                            <select id="gate${i}">
                                <option value="">Select Gate</option>
                                <option value="H">H</option>
                                <option value="X">X</option>
                                <option value="Y">Y</option>
                                <option value="Z">Z</option>
                                <option value="CX">CX</option>
                                <option value="SWAP">SWAP</option>
                            </select>
                            <input type="number" id="target${i}" min="0" max="4" placeholder="Target" style="width: 60px;">
                            <input type="number" id="control${i}" min="0" max="4" placeholder="Control" style="width: 60px;">
                        `;
                        gateControls.appendChild(div);
                    }
                }
                
                // Upload QASM
                async function uploadQASM() {
                    const fileInput = document.getElementById('qasmFile');
                    const file = fileInput.files[0];
                    const reader = new FileReader();
                    
                    reader.onload = async function(e) {
                        const qasm = e.target.result;
                        const response = await fetch('/api/upload-qasm', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ qasm: qasm })
                        });
                        
                        const result = await response.json();
                        if (result.status === 'success') {
                            document.getElementById('uploadResults').innerHTML = `
                                <div class="visualization">
                                    <h3>Circuit Diagram</h3>
                                    <img src="/api/circuit-image?qasm=${encodeURIComponent(qasm)}" width="500">
                                </div>
                                <div>
                                    <p>Qubits: ${result.num_qubits}</p>
                                    <p>Gates: ${result.num_gates}</p>
                                </div>
                            `;
                        } else {
                            document.getElementById('uploadResults').innerHTML = `
                                <p style="color: red;">Error: ${result.message}</p>
                            `;
                        }
                    };
                    
                    reader.readAsText(file);
                }
                
                // Generate circuit
                async function generateCircuit() {
                    const numQubits = parseInt(document.getElementById('numQubits').value);
                    const measure = document.getElementById('addMeasurement').checked;
                    
                    const gates = [];
                    const explanations = [];
                    
                    for (let i = 0; i < 15; i++) {
                        const gateType = document.getElementById(`gate${i}`).value;
                        if (gateType) {
                            const target = parseInt(document.getElementById(`target${i}`).value);
                            let control = null;
                            if (gateType === 'CX' || gateType === 'SWAP') {
                                control = parseInt(document.getElementById(`control${i}`).value);
                            }
                            gates.push({ gate: gateType, target, control });
                            explanations.push(explainGate(gateType, target, control));
                        }
                    }
                    
                    const response = await fetch('/api/generate-circuit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            num_qubits: numQubits,
                            gates: gates,
                            measure: measure
                        })
                    });
                    
                    const result = await response.json();
                    if (result.status === 'success') {
                        // Display circuit diagram
                        document.getElementById('circuitDiagram').innerHTML = `
                            <img src="/api/circuit-image?qasm=${encodeURIComponent(result.qasm)}" width="500">
                        `;
                        
                        // Display explanations
                        const explanationsDiv = document.getElementById('explanations');
                        explanationsDiv.innerHTML = '<h4>Step-by-Step Explanation</h4>';
                        explanations.filter(e => e).forEach(exp => {
                            explanationsDiv.innerHTML += `<p>- ${exp}</p>`;
                        });
                        
                        // Display Bloch spheres if no measurements
                        if (!result.has_measurement) {
                            const blochDiv = document.getElementById('blochSpheres');
                            blochDiv.innerHTML = '<h4>Bloch Spheres</h4><div class="columns">';
                            for (let i = 0; i < numQubits; i++) {
                                blochDiv.innerHTML += `
                                    <div class="column">
                                        <img src="/api/bloch-sphere?qasm=${encodeURIComponent(result.qasm)}&qubit_index=${i}" width="200">
                                    </div>
                                `;
                            }
                            blochDiv.innerHTML += '</div>';
                        } else {
                            document.getElementById('blochSpheres').innerHTML = `
                                <p>Bloch sphere visualization skipped (circuit contains measurements)</p>
                            `;
                        }
                    }
                }
                
                // Optimize circuit
                async function optimizeCircuit() {
                    const response = await fetch('/api/optimize-circuit');
                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        document.getElementById('optimizedCircuit').innerHTML = `
                            <p>Before Optimization: ${result.before_gates} gates</p>
                            <p>After Optimization: ${result.after_gates} gates</p>
                            <img src="/api/circuit-image?qasm=${encodeURIComponent(result.optimized_qasm)}" width="500">
                        `;
                    }
                }
                
                // Simulate noise
                async function simulateNoise() {
                    const bitFlip = document.getElementById('bitFlipNoise').checked;
                    const depolarizing = document.getElementById('depolarizingNoise').checked;
                    const measurement = document.getElementById('measurementError').checked;
                    
                    const response = await fetch('/api/simulate-noise', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            bit_flip: bitFlip,
                            depolarizing: depolarizing,
                            measurement: measurement
                        })
                    });
                    
                    const result = await response.json();
                    if (result.status === 'success') {
                        // Convert counts to chart data
                        const labels = Object.keys(result.counts);
                        const data = Object.values(result.counts);
                        
                        document.getElementById('noiseResults').innerHTML = `
                            <h3>Results with Noise</h3>
                            <canvas id="noiseChart" width="500" height="300"></canvas>
                            <script>
                                new Chart(document.getElementById('noiseChart'), {
                                    type: 'bar',
                                    data: {
                                        labels: ${JSON.stringify(labels)},
                                        datasets: [{
                                            label: 'Counts',
                                            data: ${JSON.stringify(data)},
                                            backgroundColor: 'rgba(54, 162, 235, 0.5)'
                                        }]
                                    },
                                    options: {
                                        responsive: false,
                                        scales: {
                                            y: { beginAtZero: true }
                                        }
                                    }
                                });
                            </script>
                        `;
                    }
                }
                
                // Run challenge
                async function runChallenge() {
                    const challenge = document.getElementById('challengeSelect').value;
                    
                    const response = await fetch('/api/run-challenge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ challenge: challenge })
                    });
                    
                    const result = await response.json();
                    if (result.status === 'success') {
                        // Convert counts to chart data
                        const labels = Object.keys(result.counts);
                        const data = Object.values(result.counts);
                        
                        let message = '';
                        if (result.passed) {
                            message = '<p style="color: green;">Challenge passed!</p>';
                        } else {
                            message = '<p style="color: orange;">Try again!</p>';
                        }
                        
                        document.getElementById('challengeResults').innerHTML = `
                            ${message}
                            <canvas id="challengeChart" width="500" height="300"></canvas>
                            <script>
                                new Chart(document.getElementById('challengeChart'), {
                                    type: 'bar',
                                    data: {
                                        labels: ${JSON.stringify(labels)},
                                        datasets: [{
                                            label: 'Counts',
                                            data: ${JSON.stringify(data)},
                                            backgroundColor: 'rgba(75, 192, 192, 0.5)'
                                        }]
                                    },
                                    options: {
                                        responsive: false,
                                        scales: {
                                            y: { beginAtZero: true }
                                        }
                                    }
                                });
                            </script>
                        `;
                    }
                }
                
                // Initialize the page
                initGateControls();
                document.querySelector('.tab-button').click();
            </script>
        </body>
    </html>
    """

@app.post("/api/upload-qasm")
async def upload_qasm(request: Request):
    data = await request.json()
    qasm_str = data['qasm']
    
    try:
        qc = QuantumCircuit.from_qasm_str(qasm_str)
        global current_circuit
        current_circuit = qc
        return {
            "status": "success",
            "num_qubits": qc.num_qubits,
            "num_gates": qc.size(),
            "qasm": qasm_str
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/circuit-image")
async def get_circuit_image(qasm: str):
    try:
        qc = QuantumCircuit.from_qasm_str(qasm)
        fig, ax = plt.subplots()
        qc.draw(output='mpl', ax=ax)
        
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        buf.seek(0)
        plt.close(fig)
        
        return Response(content=buf.read(), media_type="image/png")
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/bloch-sphere")
async def get_bloch_sphere(qasm: str, qubit_index: int = 0):
    try:
        qc = QuantumCircuit.from_qasm_str(qasm)
        sim_backend = Aer.get_backend('statevector_simulator')
        sim_result = execute(qc, sim_backend).result()
        state_vector = sim_result.get_statevector()
        
        reduced_dm = partial_trace(state_vector, [j for j in range(qc.num_qubits) if j != qubit_index])
        dm = DensityMatrix(reduced_dm)
        bloch_vec = get_bloch_vector(dm)

        fig = plot_bloch_vector(bloch_vec, title=f"Qubit {qubit_index}")
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        buf.seek(0)
        plt.close(fig)
        
        return Response(content=buf.read(), media_type="image/png")
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/generate-circuit")
async def generate_circuit(request: Request):
    data = await request.json()
    num_qubits = data['num_qubits']
    gates = data['gates']
    measure = data['measure']
    
    try:
        qc = QuantumCircuit(num_qubits, num_qubits if measure else 0)
        
        for gate in gates:
            if gate['gate'] == "H":
                qc.h(gate['target'])
            elif gate['gate'] == "X":
                qc.x(gate['target'])
            elif gate['gate'] == "Y":
                qc.y(gate['target'])
            elif gate['gate'] == "Z":
                qc.z(gate['target'])
            elif gate['gate'] == "CX":
                qc.cx(gate['control'], gate['target'])
            elif gate['gate'] == "SWAP":
                qc.swap(gate['control'], gate['target'])

        if measure:
            for i in range(num_qubits):
                qc.measure(i, i)
        
        global current_circuit
        current_circuit = qc
        
        return {
            "status": "success",
            "qasm": qc.qasm(),
            "has_measurement": measure
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/optimize-circuit")
async def optimize_circuit():
    global current_circuit
    if current_circuit is None:
        return {"status": "error", "message": "No circuit available to optimize"}
    
    try:
        optimized = transpile(current_circuit, optimization_level=3)
        return {
            "status": "success",
            "before_gates": len(current_circuit.data),
            "after_gates": len(optimized.data),
            "optimized_qasm": optimized.qasm()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/simulate-noise")
async def simulate_noise(request: Request):
    data = await request.json()
    bit_flip = data['bit_flip']
    depolarizing = data['depolarizing']
    measurement = data['measurement']
    
    global current_circuit
    if current_circuit is None:
        return {"status": "error", "message": "No circuit available"}
    
    try:
        noise_model = NoiseModel()
        if bit_flip:
            noise_model.add_all_qubit_quantum_error(pauli_error([("X", 0.01), ("I", 0.99)]), ["x"])
        if depolarizing:
            noise_model.add_all_qubit_quantum_error(depolarizing_error(0.02, 1), ["h", "x", "y", "z"])
        if measurement:
            error = pauli_error([("X", 0.1), ("I", 0.9)])
            noise_model.add_all_qubit_readout_error(error)

        backend = Aer.get_backend('qasm_simulator')
        temp_qc = current_circuit.copy()
        if not has_measurement(temp_qc):
            temp_qc.measure_all()

        job = execute(temp_qc, backend, noise_model=noise_model, shots=1024)
        result = job.result()
        counts = result.get_counts()
        
        return {
            "status": "success",
            "counts": counts
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/run-challenge")
async def run_challenge(request: Request):
    data = await request.json()
    challenge = data['challenge']
    
    global current_circuit
    if current_circuit is None:
        return {"status": "error", "message": "No circuit available"}
    
    try:
        if challenge == "bell":
            expected = {'00': 512, '11': 512}
        elif challenge == "flip":
            expected = {'1': 1024}
        else:
            return {"status": "error", "message": "Invalid challenge"}
        
        if not has_measurement(current_circuit):
            return {
                "status": "success",
                "counts": {},
                "passed": False,
                "message": "Add measurement to verify results!"
            }
        
        backend = Aer.get_backend('qasm_simulator')
        result = execute(current_circuit, backend, shots=1024).result()
        counts = result.get_counts()
        
        passed = counts == expected
        
        return {
            "status": "success",
            "counts": counts,
            "passed": passed
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
