import { useState } from 'react'
import QASMUploader from './components/QASMUploader'
import CircuitBuilder from './components/CircuitBuilder'
import Optimizer from './components/Optimizer'
import NoiseSimulator from './components/NoiseSimulator'
import Challenges from './components/Challenges'
import './styles.css'

export default function App() {
  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    { label: 'Upload QASM', component: <QASMUploader /> },
    { label: 'Build Circuit', component: <CircuitBuilder /> },
    { label: 'Optimize', component: <Optimizer /> },
    { label: 'Noise Simulation', component: <NoiseSimulator /> },
    { label: 'Challenges', component: <Challenges /> }
  ]

  return (
    <div className="app">
      <header>
        <h1>Qiskit Visualizer</h1>
      </header>
      
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
  )
}
