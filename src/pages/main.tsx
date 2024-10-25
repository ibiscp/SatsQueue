import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { useQueue } from '../context/QueueContext'
import { app, analytics, createQueue } from '../lib/firebase'


export default function Home() {
  const [queueName, setQueueName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const navigate = useNavigate()
  const { setQueueName:setQueueNameContext } = useQueue()

  useEffect(() => {
    console.log('Firebase app initialized:', app);
    console.log('Analytics initialized:', analytics);
  }, []);

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const queueId = await createQueue(queueName);
      setQueueNameContext(queueName, queueId);
      navigate(`/queue/${queueName}`);
    } catch (error) {
      console.error("Error creating queue:", error);
      // TODO: Show error message to user
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex flex-col items-center py-8 px-4">
      <header className="w-full max-w-md mb-8 text-white text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center">
          SatsQueue
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 ml-2" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </h1>
      </header>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create a Queue</CardTitle>
          <CardDescription>Enter queue details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateQueue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="queueName" className="text-lg">Queue Name</Label>
              <Input
                id="queueName"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                placeholder="Enter queue name"
                required
                className="text-lg py-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletAddress" className="text-lg">Wallet Address</Label>
              <Input
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter wallet address"
                required
                className="text-lg py-2"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-2">Create Queue</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
