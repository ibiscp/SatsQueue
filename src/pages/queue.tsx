import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X } from 'lucide-react'; // Import the X icon for the close button
import { getQueueData, addUserToQueue, listenToQueueUpdates } from '@/lib/firebase';

// Update the QueueItem type to match the structure from Firebase
type QueueItem = {
  name: string;
  id: string;
  createdAt: number;
  sats: number;
}

type RemovedItem = QueueItem & {
  servedAt: number;
}

export default function Queue() {
  const location = useLocation();
  const queueId = location.pathname.split('/').pop() || '';
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([])
  const [identifier, setIdentifier] = useState('')
  const [showLightningIntro, setShowLightningIntro] = useState(false);

  useEffect(() => {
    console.log('Queue ID:', queueId);
    const fetchQueueData = async () => {
      if (queueId) {
        const queueData = await getQueueData(queueId);
        if (queueData) {
          updateQueueState(queueData);
        }

        // Set up real-time listener
        const unsubscribe = listenToQueueUpdates(queueId, updateQueueState);
        return () => unsubscribe();
      }
    };

    fetchQueueData();
  }, [queueId])

  const updateQueueState = (queueData: any) => {
    setQueue(Object.values(queueData.currentQueue || {}));
    const sortedRemovedItems = Object.values(queueData.servedCustomers || {}) as RemovedItem[];
    sortedRemovedItems.sort((a, b) => b.servedAt - a.servedAt);
    setRemovedItems(sortedRemovedItems);
  };

  const joinQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (identifier.trim() && queueId) {
      try {
        await addUserToQueue(queueId, identifier.trim(), 0);
        setIdentifier('')
        setShowLightningIntro(true)
      } catch (error) {
        console.error("Error joining queue:", error);
        // TODO: Show error message to user
      }
    }
  }

  // Sort the queue by sats (descending) and then by createdAt (ascending)
  const sortedQueue = [...queue].sort((a, b) => {
    if (b.sats !== a.sats) {
      return b.sats - a.sats;
    }
    return a.createdAt - b.createdAt;
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
        <Card className="w-full md:w-1/2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Join the Queue</CardTitle>
            <CardDescription>Queue ID: {queueId}</CardDescription>
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

        <Card className="w-full md:w-1/2 shadow-lg flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Queue Status</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <div className="h-[calc(100vh-24rem)] overflow-y-auto pr-2">
              {removedItems.length > 0 && (
                <div className="mb-4 p-2 bg-gray-100 rounded">
                  <h3 className="font-bold text-lg mb-2">Last Called</h3>
                  <div className="text-3xl font-bold mb-2 text-center">{removedItems[0].name}</div>
                  <div className="text-sm text-gray-500 text-center">
                    <span>{removedItems[0].sats} sats</span>
                    <span className="mx-2">•</span>
                    <span>Waited: {Math.floor((removedItems[0].servedAt - removedItems[0].createdAt) / 60000)} minutes</span>
                  </div>
                </div>
              )}
              
              <h3 className="font-bold text-lg mb-2">Current Queue</h3>
              {sortedQueue.length === 0 ? (
                <p className="text-center text-gray-500">No one in queue yet</p>
              ) : (
                <ul className="space-y-2">
                  {sortedQueue.map((item, index) => (
                    <li key={index} className="grid grid-cols-3 gap-2 items-center border-b py-2">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="text-sm text-gray-500 text-center">{new Date(item.createdAt).toLocaleTimeString()}</span>
                      <span className="text-sm text-gray-500 text-right">{item.sats} sats</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
