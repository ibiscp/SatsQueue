import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/main'
import Queue from './pages/queue'
import Admin from './pages/admin'
import { QueueProvider } from './context/QueueContext'
import Title from './components/ui/title'

function App() {
  return (
    <Router>
      <QueueProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex flex-col">
          <div className="flex items-center justify-center pt-6">
            <Title />
          </div>
          <div className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/:name" element={
                <Queue />
              } />
              <Route path="/queue/:uuid" element={
                <Admin />
              } />
            </Routes>
          </div>
        </div>
      </QueueProvider>
    </Router>
  )
}

export default App
