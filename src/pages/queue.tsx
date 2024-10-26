import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X } from 'lucide-react';
import { getQueueData, addUserToQueue, listenToQueueUpdates, updateUserSats } from '@/lib/firebase';
import { LightningAddress } from "@getalby/lightning-tools";
import { QRCodeSVG } from 'qrcode.react';

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

const LightningQRCode = ({ lnurl, queueId, userId, onPaymentSuccess }) => {
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState(10);
  const [isPaid, setIsPaid] = useState(false);

  const generateInvoice = useCallback(async () => {
    console.log('Generating invoice for amount:', amount);
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const ln = new LightningAddress(lnurl);
      await ln.fetch();
      const invoiceObj = await ln.requestInvoice({ satoshi: amount });
      setInvoice(invoiceObj);
    } catch (err) {
      setError(`Failed to generate Lightning invoice: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [amount, lnurl]);

  useEffect(() => {
    if (amount > 0) {
      generateInvoice();
    } else {
      setInvoice(null);
      setError('');
    }
  }, [generateInvoice, amount]);

  useEffect(() => {
    let intervalId;
    if (invoice && !isPaid) {
      intervalId = setInterval(async () => {
        try {
          const paid = await invoice.isPaid();
          if (paid) {
            setIsPaid(true);
            await updateUserSats(queueId, userId, amount);
            onPaymentSuccess(amount);
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error("Error checking payment:", err);
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [invoice, isPaid, queueId, userId, amount, onPaymentSuccess]);

  const handleAmountChange = (e) => {
    const newAmount = Number(e.target.value);
    setAmount(newAmount);
    setInvoice(null);
    setIsPaid(false);
    setError('');
  };

  const handleTopUp = () => {
    setIsPaid(false);
    generateInvoice();
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Add Sats to Your Queue Position</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPaid ? (
          <>
            <Alert>
              <AlertTitle>Payment Received!</AlertTitle>
              <AlertDescription>Your position in the queue has been updated.</AlertDescription>
            </Alert>
            <Button onClick={handleTopUp}>Top Up</Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (sats)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={handleAmountChange}
                min="1"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <p>Scan this QR code with your Lightning wallet to add sats to your position in the queue:</p>
            <div className="flex justify-center" style={{ height: '256px' }}>
              {invoice ? (
                <div className="animate-fade-in">
                  <QRCodeSVG value={invoice.paymentRequest} size={256} />
                </div>
              ) : (
                <div className="animate-pulse bg-gray-200 h-64 w-64"></div>
              )}
            </div>
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(invoice?.paymentRequest || '');
                const button = document.getElementById('copyButton');
                if (button) {
                  button.textContent = 'Copied!';
                  setTimeout(() => {
                    button.textContent = 'Copy Invoice';
                  }, 2000);
                }
              }}
              className="w-full mt-2"
              id="copyButton"
              disabled={isLoading || !invoice}
            >
              Copy Invoice
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default function Queue() {
  const location = useLocation();
  const queueId = location.pathname.split('/').pop() || '';
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([])
  const [identifier, setIdentifier] = useState('')
  const [showLightningIntro, setShowLightningIntro] = useState(false);
  const [lnurl, setLnurl] = useState('');
  const [userId, setUserId] = useState(null);
  const [userJoined, setUserJoined] = useState(false);
  const [userSats, setUserSats] = useState(0);

  useEffect(() => {
    const fetchQueueData = async () => {
      if (queueId) {
        const queueData = await getQueueData(queueId);
        if (queueData) {
          updateQueueState(queueData);
          setLnurl(queueData.lnurl);
        }
      }
    };

    fetchQueueData();

    // Set up real-time listener for queue updates
    const unsubscribe = listenToQueueUpdates(queueId, (updatedQueueData) => {
      updateQueueState(updatedQueueData);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [queueId]);

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
        const newUserId = await addUserToQueue(queueId, identifier.trim(), 0);
        setUserId(newUserId);
        setUserJoined(true);
      } catch (error) {
        console.error("Error joining queue:", error);
        alert("Failed to join the queue. Please try again.");
      }
    }

  }

  const handlePaymentSuccess = (amount: number) => {
    setUserSats(prevSats => prevSats + amount);
    // Fetch the latest queue data after a successful payment
    getQueueData(queueId).then(updatedQueueData => {
      if (updatedQueueData) {
        updateQueueState(updatedQueueData);
      }
    });
  };

  // Sort the queue by sats (descending) and then by createdAt (ascending)
  const sortedQueue = [...queue].sort((a, b) => {
    if (b.sats !== a.sats) {
      return b.sats - a.sats;
    }
    return a.createdAt - b.createdAt;
  });

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">      
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2 space-y-8">
          {!userJoined ? (
            <Card className="shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 active:scale-100 active:shadow-md p-4">
              <CardHeader>
                <CardTitle className="text-2xl">Join the Queue</CardTitle>
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
                      className="text-lg py-2 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none"
                    />
                  </div>
                  <Button type="submit" className="w-full text-lg py-2 transition-all duration-200 ease-in-out hover:bg-opacity-90 active:bg-opacity-100 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none">Enter Queue</Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="shadow-lg mb-4 transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 active:scale-100 active:shadow-md p-4">
                <CardContent className="pt-6">
                  <p className="text-xl font-semibold">Welcome, {identifier}!</p>
                  <p>Your current sats: {userSats}</p>
                </CardContent>
              </Card>
              <LightningQRCode 
                lnurl={lnurl} 
                queueId={queueId}
                userId={userId}
                onPaymentSuccess={handlePaymentSuccess}
              />
            </>
          )}
        </div>

        <Card className="w-full md:w-1/2 shadow-lg flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 active:scale-100 active:shadow-md p-4">
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
          <Card className="w-full max-w-2xl shadow-lg relative transition-all duration-300 ease-in-out hover:shadow-xl">
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
