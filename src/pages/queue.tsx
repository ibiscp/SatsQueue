import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { getQueueData, addUserToQueue, listenToQueueUpdates, updateUserSats } from '@/lib/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { getNostrName, sendNostrPrivateMessage } from '../lib/nostr';
import Footer from '@/components/ui/footer';
import { generateInvoice } from '@/lib/lightning';

// Update the QueueItem type to match the structure from Firebase
type QueueItem = {
  name: string;
  id: string;
  createdAt: number;
  sats: number;
  nostrPubkey?: string;
  observation?: string;
}

type RemovedItem = QueueItem & {
  servedAt: number;
}

// Extend the Window interface to include webln
// declare global {
//   interface Window {
//     webln: any;
//   }
// }

const LightningQRCode = ({ lnurl, queueId, userId, onPaymentSuccess, pubkey }) => {
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState(10);
  const [isPaid, setIsPaid] = useState(false);

  const handleGenerateInvoice = useCallback(async () => {
    console.log('Generating invoice for amount:', amount);
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const result = await generateInvoice(lnurl, amount);
      
      if (result.error) {
        setError(result.error);
        setInvoice(null);
      } else {
        setInvoice(result.invoice);
      }
    } finally {
      setIsLoading(false);
    }
  }, [amount, lnurl]);

  useEffect(() => {
    if (amount > 0) {
      handleGenerateInvoice();
    } else {
      setInvoice(null);
      setError('');
    }
  }, [handleGenerateInvoice, amount]);

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

            // Send Nostr message
            if (pubkey) {
              const message = `⚡️ Congratulations! You paid ${amount} sats to increase your priority in the list for ${queueId}! 🚀`;
              try {
                await sendNostrPrivateMessage(pubkey, message);
                console.log('Nostr message sent successfully');
              } catch (error) {
                console.error('Error sending Nostr message:', error);
              }
            }
          }
        } catch (err) {
          console.error("Error checking payment:", err);
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [invoice, isPaid, queueId, userId, amount, onPaymentSuccess, pubkey]);

  const handleAmountChange = (e) => {
    const newAmount = Number(e.target.value);
    setAmount(newAmount);
    setInvoice(null);
    setIsPaid(false);
    setError('');
  };

  const handleTopUp = () => {
    setIsPaid(false);
    handleGenerateInvoice();
  };
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Add Sats to Your Position</CardTitle>
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
          <div className="flex flex-col">
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
            <div className="flex justify-center items-center my-4">
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
              className="w-full"
              id="copyButton"
              disabled={isLoading || !invoice}
            >
              Copy Invoice
            </Button>
          </div>
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
  const [lnurl, setLnurl] = useState('');
  const [userId, setUserId] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem(`${queueId}_userId`) || null;
  });
  const [userJoined, setUserJoined] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem(`${queueId}_userJoined`) === 'true';
  });
  const [userSats, setUserSats] = useState(() => {
    // Initialize from localStorage
    return Number(localStorage.getItem(`${queueId}_userSats`)) || 0;
  });
  const [userName, setUserName] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem(`${queueId}_userName`) || '';
  });
  const [userPubkey, setUserPubkey] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem(`${queueId}_userPubkey`) || '';
  });
  const [observation, setObservation] = useState(''); // Add this line
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Add useEffect to save state changes to localStorage
  useEffect(() => {
    if (userId) localStorage.setItem(`${queueId}_userId`, userId);
    localStorage.setItem(`${queueId}_userJoined`, String(userJoined));
    localStorage.setItem(`${queueId}_userSats`, String(userSats));
    if (userName) localStorage.setItem(`${queueId}_userName`, userName);
    if (userPubkey) localStorage.setItem(`${queueId}_userPubkey`, userPubkey);
  }, [queueId, userId, userJoined, userSats, userName, userPubkey]);

  useEffect(() => {
    const fetchQueueData = async () => {
      if (queueId) {
        const queueData = await getQueueData(queueId);
        if (queueData) {
          console.log('Initial queue data:', queueData); // Add logging
          updateQueueState(queueData);
          setLnurl(queueData.lnurl);
        }
      }
    };

    fetchQueueData();

    // Set up real-time listener for queue updates
    const unsubscribe = listenToQueueUpdates(queueId, (updatedQueueData) => {
      console.log('Queue update received:', updatedQueueData); // Add logging
      if (updatedQueueData) {
        updateQueueState(updatedQueueData);
      }
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [queueId]);

  // Add effect to fetch nostr name when identifier changes
  useEffect(() => {
    const fetchNostrName = async () => {
      if (identifier.startsWith('npub') || identifier.startsWith('nprofile') || identifier.includes('@')) {
        try {
          setIsCheckingName(true);
          const { name, pubkey } = await getNostrName(identifier);
          if (name) {
            setUserName(name);
            setUserPubkey(pubkey);
          }
        } catch (error) {
          console.error("Error fetching nostr name:", error);
        } finally {
          setIsCheckingName(false);
        }
      }
    };

    fetchNostrName();
  }, [identifier]);

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
        let name = userName || identifier.trim();
        let pubkey = userPubkey;

        if (!userName && identifier.startsWith('npub')) {
          const nostrData = await getNostrName(identifier);
          name = nostrData.name || identifier;
          pubkey = nostrData.pubkey;
        }

        // Update addUserToQueue call to include observation
        const newUserId = await addUserToQueue(queueId, name, pubkey, 0, observation);
        setUserId(newUserId);
        setUserJoined(true);
        setUserName(name);
        setUserPubkey(pubkey);

        // Send Nostr message
        if (pubkey) {
          const message = `🎉 You are in the waiting list for ${queueId}! 🚀`;
          await sendNostrPrivateMessage(pubkey, message);
        }
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

  // Add this function to handle logout
  const handleLogout = () => {
    localStorage.removeItem(`${queueId}_userId`);
    localStorage.removeItem(`${queueId}_userJoined`);
    localStorage.removeItem(`${queueId}_userSats`);
    localStorage.removeItem(`${queueId}_userName`);
    localStorage.removeItem(`${queueId}_userPubkey`);
    setUserId(null);
    setUserJoined(false);
    setUserSats(0);
    setUserName('');
    setUserPubkey('');
    setIdentifier('');
    setObservation('');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center">      
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8 flex-grow p-6">
        <div className="w-full md:w-1/2 space-y-8">
          {!userJoined ? (
            <Card className="shadow-lg p-4">
              <CardHeader>
                <CardTitle className="text-2xl">Join the Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={joinQueue} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-lg">Your Name, Nostr npub, nprofile or NIP-05</Label>
                    <div className="relative">
                      <Input
                        id="identifier"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Enter your name or Nostr npub"
                        required
                        className="text-lg py-2 pr-10 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {isCheckingName && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                      </div>
                    </div>
                    {userName && (identifier.startsWith('npub') || identifier.startsWith('nprofile') || identifier.includes('@')) && (
                      <p className="text-sm text-gray-600">Nostr name: {userName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observation" className="text-lg">Observation</Label>
                    <Input
                      id="observation"
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Add any notes or observations"
                      className="text-lg py-2 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none"
                    />
                  </div>
                  <Button type="submit" className="w-full text-lg py-2 transition-all duration-200 ease-in-out hover:bg-opacity-90 active:bg-opacity-100 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none">
                    Enter Queue
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="shadow-lg mb-4 p-4">
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold mb-2">Welcome, {userName}!</p>
                  <p>Your current position: {userSats} sats ({sortedQueue.findIndex(item => item.id === userId) + 1} of {sortedQueue.length})</p>
                  <Button 
                    onClick={handleLogout}
                    variant="destructive"
                    className="mt-4 w-full"
                  >
                    Logout
                  </Button>
                </CardContent>
              </Card>
              <LightningQRCode 
                lnurl={lnurl} 
                queueId={queueId}
                userId={userId}
                onPaymentSuccess={handlePaymentSuccess}
                pubkey={userPubkey}
              />
            </>
          )}
        </div>

        <Card className="w-full md:w-1/2 shadow-lg flex flex-col h-[calc(100vh-12rem)] p-4">
          <CardHeader>
            <CardTitle className="text-2xl">Queue Status</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden flex flex-col">
            {/* Last called section - fixed outside scroll area */}
            {removedItems.length > 0 && (
              <div className="mb-4 p-2 bg-gray-100 rounded">
                <div className="text-3xl font-bold mb-2 text-center">{removedItems[0].name}</div>
                <div className="text-sm text-gray-500 text-center">
                  <span>{removedItems[0].sats} sats</span>
                  <span className="mx-2">•</span>
                  <span>Waited: {Math.floor((removedItems[0].servedAt - removedItems[0].createdAt) / 60000)} minutes</span>
                </div>
                {removedItems[0].observation && (
                  <div className="text-sm text-gray-500 mt-2 text-center italic">
                    {removedItems[0].observation}
                  </div>
                )}
              </div>
            )}

            {/* Scrollable queue section */}
            <div className="flex-grow overflow-y-auto pr-2">
              {sortedQueue.length === 0 ? (
                <p className="text-center text-gray-500">No one in queue yet</p>
              ) : (
                <ul className="space-y-2">
                  {sortedQueue.map((item, index) => (
                    <li key={index} className="border-b py-2">
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <span className="font-medium truncate">{item.name}</span>
                        <span className="text-sm text-gray-500 text-center">{new Date(item.createdAt).toLocaleTimeString()}</span>
                        <span className="text-sm text-gray-500 text-right">{item.sats} sats</span>
                      </div>
                      {item.observation && (
                        <div className="text-sm text-gray-500 mt-1 text-center">
                          {item.observation}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* {showLightningIntro && (
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
      )} */}
      <Footer />
    </div>
  )
}
