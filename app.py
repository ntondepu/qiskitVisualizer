import streamlit as st
from qiskit import QuantumCircuit, Aer, execute, transpile
from qiskit.visualization import plot_bloch_multivector
from qiskit_ibm_provider import IBMProvider
from qiskit.providers.aer.noise import NoiseModel, depolarizing_error, pauli_error
import numpy as np
import matplotlib.pyplot as plt

# ============ CONFIG =============
st.set_page_config(page_title="Quantum Learning Platform", layout="wide")
st.title("🧠 Quantum Learning Platform")

# ============ TABS =============
tabs = st.tabs([
    "📤 Upload QASM File", 
    "🧱 Build Circuit", 
    "🧠 Explain Step-by-Step", 
    "🚀 Optimize Circuit", 
    "🌐 Run on IBM Quantum", 
    "🧪 Noise Simulation", 
    "🎯 Challenge Mode"
])

def explain_gate(gate, target, control):
    if gate == "H":
        return f"H on q[{target}] → Creates superposition."
    elif gate == "X":
        return f"X on q[{target}] → Flips the qubit (|0⟩ ↔ |1⟩)."
    elif gate == "Y":
        return f"Y on q[{target}] → Applies a Y-rotation."
    elif gate == "Z":
        return f"Z on q[{target}] → Applies a Z phase flip."
    elif gate == "CX":
        return f"CX from q[{control}] to q[{target}] → Entangles qubits."
    elif gate == "SWAP":
        return f"SWAP between q[{control}] and q[{target}] → Swaps their states."
    return ""

def has_measurement(circuit):
    return any(inst.operation.name == 'measure' for inst in circuit.data)

# ========== TAB 0: Upload QASM ==========
with tabs[0]:
    uploaded_file = st.file_uploader("Upload your QASM file (.qasm)", type=["qasm"])
    if uploaded_file is not None:
        try:
            qasm_str = uploaded_file.read().decode("utf-8")
            qc = QuantumCircuit.from_qasm_str(qasm_str)
            st.subheader("Circuit Diagram")
            st.pyplot(qc.draw(output="mpl"))
            st.write(f"Number of qubits: {qc.num_qubits}")
            st.write(f"Number of gates: {qc.size()}")

            if has_measurement(qc):
                backend = Aer.get_backend('qasm_simulator')
                result = execute(qc, backend, shots=1024).result()
                counts = result.get_counts()
                st.subheader("Measurement Results")
                st.bar_chart(counts)
                st.info("Bloch sphere visualization skipped (circuit contains measurements)")
            else:
                sim_backend = Aer.get_backend('statevector_simulator')
                sim_result = execute(qc, sim_backend).result()
                state_vector = sim_result.get_statevector()
                st.subheader("Bloch Sphere (Final State)")
                st.pyplot(plot_bloch_multivector(state_vector))

        except Exception as e:
            st.error(f"Error: {e}")

# ========== TAB 1: Build Circuit ==========
with tabs[1]:
    st.sidebar.header("🎛️ Circuit Builder")
    num_qubits = st.sidebar.number_input("Number of Qubits", min_value=1, max_value=5, value=2)
    st.sidebar.subheader("Add Up to 15 Gates by Position")
    gate_instructions = []
    explanations = []

    for i in range(15):
        col = st.sidebar.columns(3)
        gate_type = col[0].selectbox(f"Gate {i+1}", ["", "H", "X", "Y", "Z", "CX", "SWAP"], key=f"gate_{i}")
        target = col[1].number_input(f"q[{i}] target", min_value=0, max_value=num_qubits-1, step=1, key=f"target_{i}")
        control = None
        if gate_type in ["CX", "SWAP"]:
            control = col[2].number_input(f"q[{i}] control", min_value=0, max_value=num_qubits-1, step=1, key=f"control_{i}")
        if gate_type:
            gate_instructions.append((gate_type, target, control))
            explanations.append(explain_gate(gate_type, target, control))

    measure = st.sidebar.checkbox("Add Measurement")
    qc = QuantumCircuit(num_qubits, num_qubits if measure else 0)

    for gate, target, control in gate_instructions:
        if gate == "H":
            qc.h(target)
        elif gate == "X":
            qc.x(target)
        elif gate == "Y":
            qc.y(target)
        elif gate == "Z":
            qc.z(target)
        elif gate == "CX" and control is not None:
            qc.cx(control, target)
        elif gate == "SWAP" and control is not None:
            qc.swap(control, target)

    if measure:
        for i in range(num_qubits):
            qc.measure(i, i)

    st.subheader("🧩 Generated Circuit")
    st.pyplot(qc.draw(output="mpl"))

    st.subheader("🧠 Step-by-Step Explanation")
    for step in explanations:
        st.write("- " + step)

# ========== TAB 3: Optimize ==========
with tabs[3]:
    st.header("🚀 Optimized Circuit")
    if 'qc' in locals():
        optimized = transpile(qc, optimization_level=3)
        st.write("Before Optimization: ", len(qc.data), " gates")
        st.write("After Optimization: ", len(optimized.data), " gates")
        st.pyplot(optimized.draw(output="mpl"))
    else:
        st.info("No circuit loaded or built yet.")

# ========== TAB 4: IBM Quantum Run ==========
with tabs[4]:
    st.header("🌐 Run on IBM Quantum")
    st.warning("You need an IBM Quantum account and API token to use this feature.")
    token = st.text_input("Enter your IBM Quantum API Token:", type="password")
    if token:
        try:
            provider = IBMProvider(token=token)
            backend = provider.get_backend("ibmq_qasm_simulator")
            job = backend.run(qc, shots=1024)
            result = job.result()

            if has_measurement(qc):
                counts = result.get_counts()
                st.subheader("IBM Simulator Results")
                st.bar_chart(counts)
            else:
                st.info("Circuit has no measurements; cannot display counts.")

        except Exception as e:
            st.error(f"Failed to connect or run: {e}")

# ========== TAB 5: Noise Simulation ==========
with tabs[5]:
    st.header("🧪 Simulate Quantum Noise")
    noise_model = NoiseModel()
    if st.checkbox("Add Bit-flip Noise"):
        noise_model.add_all_qubit_quantum_error(pauli_error([("X", 0.01), ("I", 0.99)]), ["x"])
    if st.checkbox("Add Depolarizing Noise"):
        noise_model.add_all_qubit_quantum_error(depolarizing_error(0.02, 1), ["h", "x", "y", "z"])
    if st.checkbox("Add Measurement Error"):
        error = pauli_error([("X", 0.1), ("I", 0.9)])
        noise_model.add_all_qubit_readout_error(error)

    backend = Aer.get_backend('qasm_simulator')
    job = execute(qc, backend, noise_model=noise_model, shots=1024)
    result = job.result()

    if has_measurement(qc):
        st.subheader("Results with Noise")
        st.bar_chart(result.get_counts())
    else:
        st.info("Circuit has no measurements; cannot display counts.")

# ========== TAB 6: Challenge Mode ==========
with tabs[6]:
    st.header("🎯 Quantum Challenge Mode")
    challenge = st.selectbox("Choose a challenge", ["Create a Bell State", "Flip qubit with one gate"])
    if challenge == "Create a Bell State":
        st.markdown("Hint: Use H and CX gates")
        expected = {'00': 512, '11': 512}
    elif challenge == "Flip qubit with one gate":
        st.markdown("Hint: Try the X gate")
        expected = {'1': 1024}

    run = st.button("Run My Circuit")
    if run:
        if has_measurement(qc):
            backend = Aer.get_backend('qasm_simulator')
            result = execute(qc, backend, shots=1024).result()
            counts = result.get_counts()
            st.bar_chart(counts)
            if all(k in counts for k in expected):
                st.success("✅ Challenge passed!")
            else:
                st.error("❌ Not quite. Try again!")
        else:
            st.error("The circuit must contain measurements to run the challenge.")
