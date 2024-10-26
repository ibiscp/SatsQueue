import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/main'
import Queue from './pages/queue'
import Admin from './pages/admin'
import { QueueProvider } from './context/QueueContext'
import WAVES from 'vanta/dist/vanta.waves.min'
import SharedTitle from './components/ui/SharedTitle'

function App() {
  const [vantaEffect, setVantaEffect] = useState(null)
  const vantaRef = useRef(null)

  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(WAVES({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color: 0x4b0082,
        shininess: 60.00,
        waveHeight: 20.00,
        waveSpeed: 1.00,
        zoom: 0.65
      }))
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy()
    }
  }, [vantaEffect])

  return (
    <div ref={vantaRef} className="min-h-screen">
      <Router>
        <QueueProvider>
          <div className='min-w-screen flex items-center justify-center pt-6'>
            <SharedTitle />
          </div>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:name" element={<Queue />} />
            <Route path="/queue/:uuid" element={<Admin />} />
          </Routes>
        </QueueProvider>
      </Router>
    </div>
  )
}

export default App
