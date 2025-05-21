import matplotlib
matplotlib.use('Agg')  # Set the backend to Agg for headless environments
import streamlit as st
from qiskit import QuantumCircuit, transpile
from qiskit import execute
from qiskit.providers.aer import Aer
from qiskit.visualization import plot_bloch_vector
from qiskit.quantum_info import partial_trace, DensityMatrix
from qiskit.providers.aer.noise import NoiseModel, depolarizing_error, pauli_error
import numpy as np
import matplotlib.pyplot as plt

# Requirements check
try:
    import qiskit
    import matplotlib
    import numpy
    import streamlit
except ImportError as e:
    st.error(f"Missing required package: {e.name}. Please install all requirements.")
    st.stop()

# ============ CONFIG =============
st.set_page_config(page_title="Quantum Learning Platform", layout="wide")
st.title("Quantum Learning Platform")

# ============ TABS =============
tabs = st.tabs([
    "Upload QASM File",
    "Build Circuit",
    "Optimize Circuit",
    "Noise Simulation",
    "Challenge Mode",
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

def get_bloch_vector(rho):
    """Compute the Bloch vector from a single-qubit density matrix with numerical stability."""
    paulis = [
        np.array([[0, 1], [1, 0]]),        # X
        np.array([[0, -1j], [1j, 0]]),     # Y
        np.array([[1, 0], [0, -1]])        # Z
    ]
    
    try:
        with np.errstate(divide='ignore', invalid='ignore'):
            bloch_vec = np.array([np.trace(rho.data @ p).real for p in paulis])
            bloch_vec = np.nan_to_num(bloch_vec, nan=0.0, posinf=0.0, neginf=0.0)
            norm = np.linalg.norm(bloch_vec)
            if norm > 1e-8:  # Only normalize if vector isn't effectively zero
                bloch_vec = bloch_vec / norm
        return bloch_vec
    except Exception:
        return np.zeros(3)

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
                try:
                    sim_backend = Aer.get_backend('statevector_simulator')
                    with np.errstate(divide='ignore', invalid='ignore'):
                        sim_result = execute(qc, sim_backend).result()
                        state_vector = sim_result.get_statevector()
                        
                        if np.any(np.isnan(state_vector)) or np.any(np.isinf(state_vector)):
                            st.error("Invalid state vector obtained - circuit may be numerically unstable")
                        else:
                            num_qubits = qc.num_qubits
                            st.subheader("Bloch Sphere (Final State of Each Qubit)")
                            cols = st.columns(min(num_qubits, 5))
                            for i in range(num_qubits):
                                try:
                                    reduced_dm = partial_trace(state_vector, [j for j in range(num_qubits) if j != i])
                                    if np.allclose(reduced_dm.data, np.zeros_like(reduced_dm.data)):
                                        st.warning(f"Qubit {i} has zero density matrix - cannot visualize")
                                        continue
                                        
                                    dm = DensityMatrix(reduced_dm)
                                    bloch_vec = get_bloch_vector(dm)

                                    fig = plot_bloch_vector(bloch_vec, title=f"Qubit {i}")
                                    fig.set_size_inches(3, 3)
                                    with cols[i % 5]:
                                        st.pyplot(fig)
                                    plt.close(fig)
                                except Exception as e:
                                    st.error(f"Visualization failed for qubit {i}: {str(e)}")
                except Exception as e:
                    st.error(f"Simulation failed: {str(e)}")

        except Exception as e:
            st.error(f"Error: {e}")

# ========== TAB 1: Build Circuit ==========
with tabs[1]:
    st.sidebar.header("Circuit Builder")
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

    st.subheader("Generated Circuit")
    st.pyplot(qc.draw(output="mpl"))
    plt.close()

    st.subheader("Step-by-Step Explanation")
    for step in explanations:
        st.write("- " + step)

    if not measure:
        try:
            sim_backend = Aer.get_backend('statevector_simulator')
            with np.errstate(divide='ignore', invalid='ignore'):
                sim_result = execute(qc, sim_backend).result()
                state_vector = sim_result.get_statevector()
                
                if np.any(np.isnan(state_vector)) or np.any(np.isinf(state_vector)):
                    st.error("Invalid state vector obtained - circuit may be numerically unstable")
                else:
                    st.subheader("Bloch Sphere (Final State of Each Qubit)")
                    cols = st.columns(min(num_qubits, 5))
                    for i in range(num_qubits):
                        try:
                            reduced_dm = partial_trace(state_vector, [j for j in range(num_qubits) if j != i])
                            if np.allclose(reduced_dm.data, np.zeros_like(reduced_dm.data)):
                                st.warning(f"Qubit {i} has zero density matrix - cannot visualize")
                                continue
                                
                            dm = DensityMatrix(reduced_dm)
                            bloch_vec = get_bloch_vector(dm)

                            fig = plot_bloch_vector(bloch_vec, title=f"Qubit {i}")
                            fig.set_size_inches(3, 3)
                            with cols[i % 5]:
                                st.pyplot(fig)
                            plt.close(fig)
                        except Exception as e:
                            st.error(f"Visualization failed for qubit {i}: {str(e)}")
        except Exception as e:
            st.error(f"Simulation failed: {str(e)}")
    else:
        st.info("Bloch sphere visualization skipped (circuit contains measurements)")

# ========== TAB 2: Optimize ==========
with tabs[2]:
    st.header("Optimized Circuit")
    if 'qc' in locals():
        optimized = transpile(qc, optimization_level=3)
        st.write("Before Optimization: ", len(qc.data), " gates")
        st.write("After Optimization: ", len(optimized.data), " gates")
        st.pyplot(optimized.draw(output="mpl"))
        plt.close()
    else:
        st.info("Build or upload a circuit first to optimize.")

# ========== TAB 3: Noise Simulation ==========
with tabs[3]:
    st.header("Simulate Quantum Noise")
    noise_model = NoiseModel()
    if st.checkbox("Add Bit-flip Noise"):
        noise_model.add_all_qubit_quantum_error(pauli_error([("X", 0.01), ("I", 0.99)]), ["x"])
    if st.checkbox("Add Depolarizing Noise"):
        noise_model.add_all_qubit_quantum_error(depolarizing_error(0.02, 1), ["h", "x", "y", "z"])
    if st.checkbox("Add Measurement Error"):
        error = pauli_error([("X", 0.1), ("I", 0.9)])
        noise_model.add_all_qubit_readout_error(error)

    backend = Aer.get_backend('qasm_simulator')

    if 'qc' in locals():
        temp_qc = qc.copy()
        if not has_measurement(temp_qc):
            temp_qc.measure_all()

        try:
            job = execute(temp_qc, backend, noise_model=noise_model, shots=1024)
            result = job.result()
            st.subheader("Results with Noise")
            st.bar_chart(result.get_counts())
        except Exception as e:
            st.error(f"Noise simulation failed: {str(e)}")
    else:
        st.info("Build or upload a circuit first to simulate noise.")

# ========== TAB 4: Challenge Mode ==========
with tabs[4]:
    st.header("Quantum Challenge Mode")
    challenge = st.selectbox("Choose a challenge", ["Create a Bell State", "Flip qubit with one gate"])
    if challenge == "Create a Bell State":
        st.markdown("Hint: Use H and CX gates")
        expected = {'00': 512, '11': 512}
    elif challenge == "Flip qubit with one gate":
        st.markdown("Hint: Try the X gate")
        expected = {'1': 1024}

    run = st.button("Run My Circuit")
    if run and 'qc' in locals():
        if has_measurement(qc):
            try:
                backend = Aer.get_backend('qasm_simulator')
                result = execute(qc, backend, shots=1024).result()
                counts = result.get_counts()
                st.bar_chart(counts)
                if counts == expected:
                    st.success("Challenge passed!")
                else:
                    st.warning("Try again!")
            except Exception as e:
                st.error(f"Challenge execution failed: {str(e)}")
        else:
            st.warning("Add measurement to verify results!")
    elif run:
        st.warning("Build or upload a circuit first!")
