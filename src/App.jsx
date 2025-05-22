import { useState } from 'react';
import CircuitBuilder from './components/CircuitBuilder';
import QASMUploader from './components/QASMUploader';

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: 'Upload QASM', component: <QASMUploader /> },
    { label: 'Build Circuit', component: <CircuitBuilder /> },
    // ... other tabs ...
  ];

  return (
    <div className="app">
      <h1>Qiskit Visualizer</h1>
      <div className="tabs">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={activeTab === index ? 'active' : ''}
            onClick={() => setActiveTab(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tabs[activeTab].component}
      </div>
    </div>
  );
}

export default App;
