import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { useQueue } from '../context/QueueContext'
import { app, analytics, createQueue, checkQueueExists } from '../lib/firebase'
import { LightningAddress } from "@getalby/lightning-tools";
import { Check, X } from 'lucide-react'

export default function Home() {
  const [queueName, setQueueName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [isValidUrl, setIsValidUrl] = useState(false)
  const [isValidQueueName, setIsValidQueueName] = useState(true)
  const [isQueueNameAvailable, setIsQueueNameAvailable] = useState(true)
  const navigate = useNavigate()
  const { setQueueName:setQueueNameContext } = useQueue()

  useEffect(() => {
    console.log('Firebase app initialized:', app);
    console.log('Analytics initialized:', analytics);
  }, []);

  useEffect(() => {
    const validateUrl = async () => {
      if (walletAddress.trim()) {
        const isValid = await isValidLNURL(walletAddress);
        setIsValidUrl(isValid);
      } else {
        setIsValidUrl(false);
      }
    };
    validateUrl();
  }, [walletAddress]);

  useEffect(() => {
    const validateQueueName = async () => {
      if (queueName.trim()) {
        setIsValidQueueName(/^[a-zA-Z0-9-_]+$/.test(queueName));
        const exists = await checkQueueExists(queueName);
        setIsQueueNameAvailable(!exists);
      } else {
        setIsValidQueueName(true);
        setIsQueueNameAvailable(true);
      }
    };
    validateQueueName();
  }, [queueName]);

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (queueName.trim() && isValidUrl && isValidQueueName && isQueueNameAvailable) {
      try {
        const queueId = await createQueue(queueName, walletAddress);
        setQueueNameContext(queueName, queueId);
        navigate(`/queue/${queueName}`);
      } catch (error) {
        console.error("Error creating queue:", error);
        // TODO: Show error message to user
      }
    }
  }

  const isValidLNURL = async (url: string) => {
    try {
      const ln = new LightningAddress(url);
      await ln.fetch();
      return !!ln.lnurlpData || !!ln.keysendData;
    } catch (error) {
      console.error("Error validating LNURL:", error);
      return false;
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

      <div className="flex-grow flex items-center justify-center w-full">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Create a Queue</CardTitle>
            <CardDescription>Enter queue details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateQueue} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="queueName" className="text-lg">Name</Label>
                <div className="relative">
                  <Input
                    id="queueName"
                    value={queueName}
                    onChange={(e) => setQueueName(e.target.value)}
                    placeholder="Enter queue name"
                    required
                    className="text-lg py-2 pr-10"
                  />
                  {queueName && (
                    isValidQueueName && isQueueNameAvailable ? (
                      <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" />
                    ) : (
                      <X className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" />
                    )
                  )}
                </div>
                {!isValidQueueName && (
                  <p className="text-sm text-red-500">Queue name can only contain letters, numbers, hyphens, and underscores.</p>
                )}
                {!isQueueNameAvailable && (
                  <p className="text-sm text-red-500">This queue name is already taken. Please choose another.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="walletAddress" className="text-lg">LNURL</Label>
                <div className="relative">
                  <Input
                    id="walletAddress"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter wallet address"
                    required
                    className="text-lg py-2 pr-10"
                  />
                  {walletAddress && (
                    isValidUrl ? (
                      <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" />
                    ) : (
                      <X className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500" />
                    )
                  )}
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full text-lg py-2" 
                disabled={!isValidUrl || !queueName.trim() || !isValidQueueName || !isQueueNameAvailable}
              >
                Create Queue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
