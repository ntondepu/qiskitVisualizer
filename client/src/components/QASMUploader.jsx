import { useState } from 'react';
import { FaUpload, FaMicrochip, FaBolt, FaRobot, FaGamepad } from 'react-icons/fa';

export default function QASMUploader() {
  const [backend, setBackend] = useState('statevector_simulator');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length) {
      setFileName(e.target.files[0].name);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with animated tabs */}
        <div className="flex space-x-1 mb-8 overflow-x-auto pb-2">
          {['Upload QASM', 'Build Circuit', 'Optimize', 'Noise Simulation', 'Challenges'].map((tab, index) => (
            <button
              key={index}
              className={`px-4 py-3 rounded-t-lg font-medium flex items-center transition-all ${
                index === 0 
                  ? 'bg-purple-600 shadow-lg'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {index === 0 && <FaUpload className="mr-2" />}
              {index === 1 && <FaMicrochip className="mr-2" />}
              {index === 2 && <FaBolt className="mr-2" />}
              {index === 3 && <FaRobot className="mr-2" />}
              {index === 4 && <FaGamepad className="mr-2" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-lg rounded-xl p-6 shadow-2xl border border-purple-500">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <FaUpload className="mr-3 text-purple-300" />
            QASM File Upload
          </h2>

          {/* Backend status indicator */}
          <div className="flex items-center justify-between mb-6 p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
              <span>Backend status: <span className="font-bold text-green-400">healthy</span></span>
              <span className="ml-2 text-gray-400">(12 backends available)</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <select 
                value={backend}
                onChange={(e) => setBackend(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="statevector_simulator">STATEVECTOR</option>
                <option value="qasm_simulator">QASM</option>
                <option value="aer_simulator">AER</option>
              </select>
              
              <button className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm flex items-center transition-colors">
                <FaBolt className="mr-1" /> Refresh
              </button>
            </div>
          </div>

          {/* Interactive upload area */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging ? 'border-purple-400 bg-purple-900 bg-opacity-30' : 'border-gray-600'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
                <FaUpload className="text-2xl" />
              </div>
              
              {fileName ? (
                <>
                  <p className="text-lg font-medium">{fileName}</p>
                  <p className="text-gray-400">File ready for upload</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-medium">Drag & drop your QASM file here</p>
                  <p className="text-gray-400">or</p>
                </>
              )}
              
              <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium inline-block transition-colors">
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".qasm"
                  onChange={handleFileChange}
                />
                Browse Files
              </label>
              
              <p className="text-sm text-gray-400 mt-2">
                Supported formats: .qasm (OpenQASM 2.0)
              </p>
            </div>
          </div>

          {/* Fun decorative elements */}
          <div className="flex justify-between mt-6 opacity-70">
            <div className="text-xs text-gray-500 flex items-center">
              <span className="animate-pulse">⚛️</span> Quantum magic happening here
            </div>
            <div className="text-xs text-gray-500">
              Powered by Qiskit <span className="text-purple-300">|0⟩ + |1⟩</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
