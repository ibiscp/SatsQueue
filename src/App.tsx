import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Home from '../app/page'
import Line from '../app/[uuid]/page'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:uuid" element={<Line />} />
      </Routes>
    </Router>
  )
}

export default App
