import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

type QueueItem = {
  identifier: string;
  timestamp: number;
}

export default function Line() {
  const { uuid } = useParams<{ uuid: string }>()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [identifier, setIdentifier] = useState('')

  const joinLine = (e: React.FormEvent) => {
    e.preventDefault()
    if (identifier.trim()) {
      const newItem = { identifier: identifier.trim(), timestamp: Date.now() }
      setQueue([...queue, newItem])
      setIdentifier('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex flex-col items-center py-8 px-4">
      <header className="w-full max-w-md mb-8 text-white text-center">
        <h1 className="text-3xl font-bold mb-2">SatsQueue</h1>
        <p className="text-xl">Join the lightning-fast queue!</p>
      </header>
      
      <Card className="w-full max-w-md mb-4 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Current Line State</CardTitle>
          <CardDescription>Line ID: {uuid}</CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-center text-gray-500">No one in line yet</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((item, index) => (
                <li key={index} className="flex justify-between items-center border-b py-2">
                  <span className="font-medium">{item.identifier}</span>
                  <span className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Join the Line</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={joinLine} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-lg">Your Name</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your name"
                required
                className="text-lg py-2"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-2">Enter Line</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
