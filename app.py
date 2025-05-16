import streamlit as st
from qiskit import QuantumCircuit, Aer, execute
from qiskit.visualization import plot_bloch_vector, plot_bloch_multivector
from qiskit.quantum_info import Statevector, Pauli, partial_trace
import numpy as np
import openai
import matplotlib.pyplot as plt

# ============ CONFIG =============
st.set_page_config(page_title="Quantum Learning Platform", layout="wide")
st.title("🧠 Quantum Learning Platform with AI Chatbot")

# ============ OPENAI SETUP ============
openai.api_key = st.secrets.get("OPENAI_API_KEY", "")

def ask_openai(prompt, model="gpt-3.5-turbo", temperature=0.7):
    try:
        response = openai.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error: {e}"

# ============ TABS =============
tab_upload, tab_build, tab_info, tab_chat, tab_dragdrop = st.tabs(
    ["📤 Upload QASM File", "🧱 Build Circuit", "📚 Quantum Info", "🤖 Ask AI Chatbot", "🛠️ Drag & Drop Circuit (Demo)"]
)

# ========== TAB 1: Upload QASM ==========
with tab_upload:
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
            st.error(f"Error: {e}")

# ========== TAB 2: Build Circuit ==========
with tab_build:
    st.sidebar.header("🎛️ Circuit Builder")
    num_qubits = st.sidebar.number_input("Number of Qubits", min_value=1, max_value=5, value=2)

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
        if num_qubits == 1:
            st.subheader("🎬 Gate-by-Gate Bloch Sphere Animation")
            state = Statevector.from_label('0')
            for idx, instruction in enumerate(qc.data):
                state = state.evolve(instruction)
                bloch_vec = [
                    2 * np.real(state.expectation_value(Pauli('X'))),
                    2 * np.real(state.expectation_value(Pauli('Y'))),
                    2 * np.real(state.expectation_value(Pauli('Z')))
                ]
                fig = plot_bloch_vector(bloch_vec, title=f"After gate {idx + 1}: {instruction.operation.name}")
                st.pyplot(fig)
        else:
            st.subheader("🌀 Bloch Sphere (Final State)")
            backend = Aer.get_backend('statevector_simulator')
            result = execute(qc, backend).result()
            statevector = result.get_statevector()
            sv = Statevector(statevector)
            for i in range(num_qubits):
                traced = partial_trace(sv, [j for j in range(num_qubits) if j != i])
                bloch_vector = [2 * np.real(traced.expectation_value(Pauli(p))) for p in ['X', 'Y', 'Z']]
                fig = plot_bloch_vector(bloch_vector, title=f"Qubit {i}")
                st.pyplot(fig)
    else:
        st.subheader("📊 Measurement Results")
        backend = Aer.get_backend('qasm_simulator')
        result = execute(qc, backend, shots=1024).result()
        counts = result.get_counts()
        st.bar_chart(counts)

    st.subheader("📥 Download QASM File")
    qasm_str = qc.qasm()
    st.download_button(
        label="Download circuit as QASM",
        data=qasm_str,
        file_name="custom_circuit.qasm",
        mime="text/plain"
    )

# ========== TAB 3: Quantum Info ==========
with tab_info:
    st.header("Quantum Concepts Explained")
    topic = st.selectbox("Choose a topic", ["Hadamard Gate (H)", "Pauli-X Gate (X)", "Qubit", "Measurement"])

    info = {
        "Hadamard Gate (H)": """\
The Hadamard gate (H) is one of the fundamental single-qubit gates in quantum computing. It transforms the basis states |0⟩ and |1⟩ into equal superpositions:
|0⟩ → (|0⟩ + |1⟩) / √2
|1⟩ → (|0⟩ - |1⟩) / √2
This ability to create superposition is key for many quantum algorithms that rely on parallelism.

By applying the H gate, a qubit initially in a definite state can be put into a state where it simultaneously represents multiple possibilities. This gate is also its own inverse, meaning applying it twice returns the qubit to its original state.

Understanding the Hadamard gate is essential for grasping the power of quantum interference and the behavior of quantum algorithms like the Deutsch-Jozsa and Grover's search algorithm.
""",
        "Pauli-X Gate (X)": """\
The Pauli-X gate acts as a quantum NOT gate, flipping the state of a qubit:
|0⟩ ↔ |1⟩

This gate is essential for manipulating qubits and is often used in constructing more complex operations. It corresponds to a rotation of the qubit's Bloch vector by π radians about the X-axis.

The Pauli-X gate is also a key building block in quantum error correction and quantum algorithms, enabling the reversal or flipping of qubit states as needed.
""",
        "Qubit": """\
A qubit is the fundamental unit of quantum information, analogous to a classical bit but with much richer behavior.

Unlike classical bits that are either 0 or 1, qubits can exist in a superposition of both states simultaneously, described by complex amplitudes. This superposition enables quantum computers to process a vast number of possibilities at once.

Qubits also exhibit entanglement, a quantum phenomenon where the state of one qubit is intrinsically linked to another, regardless of distance. Together, superposition and entanglement provide the foundation for the power of quantum computation.
""",
        "Measurement": """\
Measurement in quantum computing is the process of extracting classical information from a qubit.

When a qubit is measured, its superposition collapses probabilistically to either |0⟩ or |1⟩. The outcome depends on the probability amplitudes of the superposition state.

This collapse is irreversible and destroys the quantum state, which is why measurements are typically deferred until the end of a quantum algorithm. Understanding measurement is crucial for interpreting quantum computations and designing algorithms.
"""
    }

    st.markdown(info[topic])

# ========== TAB 4: AI Chatbot ==========
with tab_chat:
    st.header("🤖 Ask the Quantum AI Chatbot")

    if not openai.api_key:
        st.error("OpenAI API key not found. Please set your OpenAI API key in Streamlit secrets as `OPENAI_API_KEY`.")
    else:
        if "chat_history" not in st.session_state:
            st.session_state.chat_history = []

        user_input = st.text_input("Enter your question about quantum computing:")

        if user_input:
            st.session_state.chat_history.append({"role": "user", "content": user_input})

            # Generate AI response
            try:
                response = openai.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=st.session_state.chat_history,
                    temperature=0.7,
                )
                answer = response.choices[0].message.content.strip()
            except Exception as e:
                answer = f"Error: {e}"

            st.session_state.chat_history.append({"role": "assistant", "content": answer})

        # Display chat history
        for chat in st.session_state.chat_history:
            if chat["role"] == "user":
                st.markdown(f"**You:** {chat['content']}")
            else:
                st.markdown(f"**AI:** {chat['content']}")

# ========== TAB 5: Drag & Drop Circuit (Demo Placeholder) ==========
with tab_dragdrop:
    st.header("🛠️ Drag & Drop Circuit Builder - Demo")
    st.info("Full drag-and-drop quantum circuit builder requires React + Streamlit Components integration, which is beyond basic Streamlit Python. This placeholder demonstrates where that feature will go.")

    st.markdown("""
    - Drag qubits and gates to build circuits visually  
    - Get real-time feedback on gate correctness  
    - Guided hints and AI suggestions  
    """)
