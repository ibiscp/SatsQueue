import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Home from './pages/main'
import { QueueProvider } from './context/QueueContext'
import Queue from './pages/queue'
import Admin from './pages/admin'

function App() {
  return (
    <Router>
        <QueueProvider>
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:name" element={<Queue />} />
          <Route path="/queue/:uuid" element={<Admin />} />
      </Routes>
        </QueueProvider>
    </Router>
  )
}

export default App
