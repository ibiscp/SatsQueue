import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X } from 'lucide-react'; // Import the X icon for the close button

type QueueItem = {
  identifier: string;
  timestamp: number;
  sats: number;
}

export default function Queue() {
  const { uuid } = useParams<{ uuid: string }>()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [identifier, setIdentifier] = useState('')
  const [showLightningIntro, setShowLightningIntro] = useState(false);

  useEffect(() => {
    // Simulating fetching queue data from an API
    setQueue([
      { identifier: "Alice", timestamp: Date.now() - 1200000, sats: 100 },
      { identifier: "Bob", timestamp: Date.now() - 1150000, sats: 200 },
      { identifier: "Charlie", timestamp: Date.now() - 1100000, sats: 150 },
      { identifier: "David", timestamp: Date.now() - 1050000, sats: 175 },
      { identifier: "Eva", timestamp: Date.now() - 1000000, sats: 125 },
      { identifier: "Frank", timestamp: Date.now() - 950000, sats: 225 },
      { identifier: "Grace", timestamp: Date.now() - 900000, sats: 180 },
      { identifier: "Henry", timestamp: Date.now() - 850000, sats: 140 },
      { identifier: "Ivy", timestamp: Date.now() - 800000, sats: 190 },
      { identifier: "Jack", timestamp: Date.now() - 750000, sats: 160 },
      { identifier: "Kate", timestamp: Date.now() - 700000, sats: 210 },
      { identifier: "Liam", timestamp: Date.now() - 650000, sats: 130 },
      { identifier: "Mia", timestamp: Date.now() - 600000, sats: 170 },
      { identifier: "Noah", timestamp: Date.now() - 550000, sats: 220 },
      { identifier: "Olivia", timestamp: Date.now() - 500000, sats: 145 },
      { identifier: "Peter", timestamp: Date.now() - 450000, sats: 195 },
      { identifier: "Quinn", timestamp: Date.now() - 400000, sats: 135 },
      { identifier: "Rachel", timestamp: Date.now() - 350000, sats: 185 },
      { identifier: "Sam", timestamp: Date.now() - 300000, sats: 155 },
      { identifier: "Tina", timestamp: Date.now() - 250000, sats: 205 }
    ])
  }, [])

  const joinQueue = (e: React.FormEvent) => {
    e.preventDefault()
    if (identifier.trim()) {
      const newItem = { identifier: identifier.trim(), timestamp: Date.now(), sats: 0 }
      setQueue([...queue, newItem])
      setIdentifier('')
      setShowLightningIntro(true) // Show the Lightning Network intro card
    }
  }

  // Sort the queue by sats (descending) and then by timestamp (ascending)
  const sortedQueue = [...queue].sort((a, b) => {
    if (b.sats !== a.sats) {
      return b.sats - a.sats;
    }
    return a.timestamp - b.timestamp;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex flex-col items-center py-8 px-4">
      <header className="w-full max-w-6xl mb-8 text-white text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center">
          SatsQueue
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 ml-2" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </h1>
      </header>
      
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-4">
        <Card className="w-full md:w-2/3 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Join the Queue</CardTitle>
            <CardDescription>Queue ID: {uuid}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={joinQueue} className="space-y-4">
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
              <Button type="submit" className="w-full text-lg py-2">Enter Queue</Button>
            </form>
          </CardContent>
        </Card>

        {showLightningIntro && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl shadow-lg relative">
              <Button 
                className="absolute top-2 right-2 p-2" 
                variant="ghost" 
                onClick={() => setShowLightningIntro(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              <CardHeader>
                <CardTitle className="text-2xl">Welcome to the Lightning Network!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTitle>What is the Lightning Network?</AlertTitle>
                  <AlertDescription>
                    The Lightning Network is a "layer 2" payment protocol that operates on top of Bitcoin. It enables fast, low-cost transactions between participating nodes, making it ideal for micropayments and frequent transactions.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <p className="font-semibold">Key benefits of the Lightning Network:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Instant transactions</li>
                    <li>Low fees</li>
                    <li>Scalability for millions of transactions per second</li>
                    <li>Cross-chain atomic swaps</li>
                  </ul>
                  <p>
                    To participate in this queue and potentially earn or spend sats, you'll need a Lightning-enabled wallet. Don't worry if you're new to this - we'll guide you through the process!
                  </p>
                  <div className="mt-4">
                    <p className="font-semibold">Learn more about the Lightning Network:</p>
                    <a 
                      href="https://www.youtube.com/watch?v=rrr_zPmEiME" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Watch: Lightning Network Explained
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="w-full md:w-1/3 shadow-lg flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Current Queue Status</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <div className="h-[calc(100vh-24rem)] overflow-y-auto pr-2">
              {sortedQueue.length === 0 ? (
                <p className="text-center text-gray-500">No one in queue yet</p>
              ) : (
                <ul className="space-y-2">
                  {sortedQueue.map((item, index) => (
                    <li key={index} className="grid grid-cols-3 gap-2 items-center border-b py-2">
                      <span className="font-medium truncate">{item.identifier}</span>
                      <span className="text-sm text-gray-500 text-center">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <span className="text-sm text-gray-500 text-right">{item.sats} sats</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
