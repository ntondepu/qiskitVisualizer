import streamlit as st
from qiskit import QuantumCircuit, Aer, execute
from qiskit.visualization import plot_bloch_multivector, plot_bloch_vector
from qiskit.quantum_info import Statevector, partial_trace, Operator, Pauli
import matplotlib.pyplot as plt
import numpy as np
import json

st.set_page_config(page_title="Qiskit Visualizer", layout="centered")
st.title("🧠 Qiskit Circuit Visualizer")

# Tabs for QASM upload and Circuit Builder
tab1, tab2 = st.tabs(["📤 Upload QASM File", "🧱 Build Circuit"])

# ============================ TAB 1: UPLOAD QASM ============================
with tab1:
    uploaded_file = st.file_uploader("Upload your QASM file (.qasm)", type=["qasm"])

    if uploaded_file is not None:
        try:
            qasm_str = uploaded_file.read().decode("utf-8")
            qc = QuantumCircuit.from_qasm_str(qasm_str)

            st.subheader("Circuit Diagram")
            st.pyplot(qc.draw(output="mpl"))

            st.write(f"Number of qubits: {qc.num_qubits}")
            st.write(f"Number of gates: {qc.size()}")

            backend = Aer.get_backend('qasm_simulator')
            result = execute(qc, backend, shots=1024).result()
            counts = result.get_counts()
            st.subheader("Measurement Results")
            st.bar_chart(counts)

            if not any(inst.operation.name == 'measure' for inst in qc.data):
                sim_backend = Aer.get_backend('statevector_simulator')
                sim_result = execute(qc, sim_backend).result()
                state_vector = sim_result.get_statevector()
                st.subheader("Bloch Sphere (Final State)")
                st.pyplot(plot_bloch_multivector(state_vector))
            else:
                st.info("Bloch sphere visualization skipped (circuit contains measurements)")

        except Exception as e:
            st.warning("Something went wrong while processing your QASM file. Here's the error:")
            st.code(str(e), language='text')

# ============================ TAB 2: CIRCUIT BUILDER ============================
with tab2:
    st.sidebar.header("🎛️ Circuit Builder")
    num_qubits = st.sidebar.number_input("Number of Qubits", min_value=1, max_value=6, value=2)

    st.sidebar.subheader("Apply Gates")
    apply_h = st.sidebar.checkbox("H gate on q[0]")
    apply_x = st.sidebar.checkbox("X gate on q[1]")
    apply_y = st.sidebar.checkbox("Y gate on q[0]")
    apply_z = st.sidebar.checkbox("Z gate on q[1]")
    apply_cx = st.sidebar.checkbox("CX (q[0] → q[1])")
    apply_swap = st.sidebar.checkbox("SWAP (q[0] ↔ q[1])")
    measure = st.sidebar.checkbox("Add Measurement")

    qc = QuantumCircuit(num_qubits, num_qubits if measure else 0)

    if apply_h:
        qc.h(0)
    if apply_x and num_qubits > 1:
        qc.x(1)
    if apply_y:
        qc.y(0)
    if apply_z and num_qubits > 1:
        qc.z(1)
    if apply_cx and num_qubits > 1:
        qc.cx(0, 1)
    if apply_swap and num_qubits > 1:
        qc.swap(0, 1)
    if measure:
        for i in range(num_qubits):
            qc.measure(i, i)

    st.subheader("🧩 Generated Circuit")
    st.pyplot(qc.draw(output="mpl"))

    if not measure:
        st.subheader("🌀 Bloch Sphere (Final State)")
        try:
            backend = Aer.get_backend('statevector_simulator')
            result = execute(qc, backend).result()
            statevector = result.get_statevector()

            if num_qubits == 1:
                st.pyplot(plot_bloch_multivector(statevector))
            else:
                sv = Statevector(statevector)
                for i in range(num_qubits):
                    reduced = partial_trace(sv, [j for j in range(num_qubits) if j != i])
                    bloch_vector = [2 * np.real(reduced.expectation_value(Pauli(p))) for p in ['X', 'Y', 'Z']]
                    fig = plot_bloch_vector(bloch_vector, title=f"Qubit {i}")
                    st.pyplot(fig)

                # Export Bloch vector data
                st.download_button(
                    label="Download Bloch Vectors as JSON",
                    data=json.dumps({
                        f"q[{i}]": [float(round(x, 4)) for x in [2 * np.real(partial_trace(sv, [j for j in range(num_qubits) if j != i]).expectation_value(Pauli(p))) for p in ['X', 'Y', 'Z']]]
                        for i in range(num_qubits)
                    }, indent=2),
                    file_name="bloch_vectors.json",
                    mime="application/json"
                )

        except Exception as e:
            st.warning("Simulation failed. Details below:")
            st.code(str(e), language='text')
    else:
        st.subheader("📊 Measurement Results")
        try:
            backend = Aer.get_backend('qasm_simulator')
            result = execute(qc, backend, shots=1024).result()
            counts = result.get_counts()
            st.bar_chart(counts)
        except Exception as e:
            st.warning("Measurement simulation failed. Details below:")
            st.code(str(e), language='text')

    st.subheader("📥 Download QASM File")
    try:
        qasm_str = qc.qasm()
        st.download_button(
            label="Download circuit as QASM",
            data=qasm_str,
            file_name="custom_circuit.qasm",
            mime="text/plain"
        )
    except Exception as e:
        st.warning("Could not generate QASM. Details:")
        st.code(str(e), language='text')
