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
import Footer from '../components/ui/Footer'


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
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-center px-4 py-8 flex-grow">
        <Card className="w-full max-w-md shadow-lg bg-white bg-opacity-90 transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 active:scale-100 active:shadow-md">
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
                    className="text-lg py-2 pr-10 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none"
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
                    className="text-lg py-2 pr-10 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none"
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
                className="w-full text-lg py-2 transition-all duration-200 ease-in-out hover:bg-opacity-90 active:bg-opacity-100 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none" 
                disabled={!isValidUrl || !queueName.trim() || !isValidQueueName || !isQueueNameAvailable}
              >
                Create Queue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
