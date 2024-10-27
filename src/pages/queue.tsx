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

const LightningQRCode = ({ lnurl, queueId, userId, onPaymentSuccess, pubkey }) => {
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState(10);
  const [isPaid, setIsPaid] = useState(false);
  const [queueItem, setQueueItem] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const predefinedAmounts = [10, 50, 100, 500, 1000];

  useEffect(() => {
    const fetchQueueItem = async () => {
      const queueData = await getQueueData(queueId);
      if (queueData && queueData.currentQueue) {
        const item = Object.values(queueData.currentQueue).find(item => item.id === userId);
        setQueueItem(item);
      }
    };
    fetchQueueItem();
  }, [queueId, userId]);

  // Reset state when userId changes
  useEffect(() => {
    setInvoice(null);
    setError('');
    setIsPaid(false);
    setAmount(10);
    setIsInitialized(true);
  }, [userId]);

  // Only generate initial invoice after component is initialized
  useEffect(() => {
    if (isInitialized && lnurl) {
      handleGenerateInvoice(10);
    }
  }, [isInitialized, lnurl]);

  const handleGenerateInvoice = useCallback(async (satAmount = amount) => {
    console.log('Generating invoice for amount:', satAmount);
    if (satAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setInvoice(null);
      
      const result = await generateInvoice(lnurl, satAmount);
      
      if (result.error) {
        setError(result.error);
        setInvoice(null);
      } else {
        setInvoice(result.invoice);
      }
    } finally {
      setIsLoading(false);
    }
  }, [lnurl, amount]);

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

            // Send Nostr messages
            const myUserId = localStorage.getItem(`${queueId}_userId`);
            const isTopUpForOther = userId !== myUserId;
            
            if (isTopUpForOther && queueItem) {
              // Send message to person who topped up
              if (pubkey) {
                const senderMessage = `⚡️ You just topped up ${queueItem.name}'s position with ${amount} sats in ${queueId}! 🎉`;
                try {
                  await sendNostrPrivateMessage(pubkey, senderMessage);
                  console.log('Nostr message sent to sender successfully');
                } catch (error) {
                  console.error('Error sending Nostr message to sender:', error);
                }
              }

              // Send message to person who received the top-up
              if (queueItem.nostrPubkey) {
                const recipientMessage = `⚡️ Someone just topped up your position with ${amount} sats in ${queueId}! 🎉`;
                try {
                  await sendNostrPrivateMessage(queueItem.nostrPubkey, recipientMessage);
                  console.log('Nostr message sent to recipient successfully');
                } catch (error) {
                  console.error('Error sending Nostr message to recipient:', error);
                }
              }
            } else {
              // Send message for self top-up
              if (pubkey) {
                const message = `⚡️ You just topped up your position with ${amount} sats in ${queueId}! 🎉`;
                try {
                  await sendNostrPrivateMessage(pubkey, message);
                  console.log('Nostr message sent successfully');
                } catch (error) {
                  console.error('Error sending Nostr message:', error);
                }
              }
            }
          }
        } catch (err) {
          console.error("Error checking payment:", err);
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [invoice, isPaid, queueId, userId, amount, onPaymentSuccess, pubkey, queueItem]);

  const handleAmountChange = (e) => {
    const newAmount = Number(e.target.value);
    setAmount(newAmount);
    handleGenerateInvoice(newAmount);
  };

  const handleAmountClick = (newAmount) => {
    setAmount(newAmount);
    handleGenerateInvoice(newAmount);
  };

  return (
    <div className="space-y-4">
      {isPaid ? (
        <>
          <Alert>
            <AlertDescription>
              ⚡️ Congratulations, you have topped up {userId === localStorage.getItem(`${queueId}_userId`) ? 'your' : `${queueItem?.name}'s`} queue position with {amount} sats! 🎉
            </AlertDescription>
          </Alert>
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
            <div className="flex flex-wrap gap-2 mt-2">
              {predefinedAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  onClick={() => handleAmountClick(amt)}
                  className={`flex-1 ${amount === amt ? 'bg-blue-100' : ''}`}
                  disabled={isLoading}
                >
                  {amt}
                </Button>
              ))}
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-center items-center my-4">
            {isLoading ? (
              <div className="animate-pulse bg-gray-200 h-64 w-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : invoice ? (
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
    </div>
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
    return localStorage.getItem(`${queueId}_userId`) || null;
  });
  const [userJoined, setUserJoined] = useState(() => {
    return localStorage.getItem(`${queueId}_userJoined`) === 'true';
  });
  const [userSats, setUserSats] = useState(() => {
    return Number(localStorage.getItem(`${queueId}_userSats`)) || 0;
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem(`${queueId}_userName`) || '';
  });
  const [userPubkey, setUserPubkey] = useState(() => {
    return localStorage.getItem(`${queueId}_userPubkey`) || '';
  });
  const [observation, setObservation] = useState('');
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
          console.log('Initial queue data:', queueData);
          updateQueueState(queueData);
          setLnurl(queueData.lnurl);
        }
      }
    };

    fetchQueueData();

    const unsubscribe = listenToQueueUpdates(queueId, (updatedQueueData) => {
      console.log('Queue update received:', updatedQueueData);
      if (updatedQueueData) {
        updateQueueState(updatedQueueData);
        // Update userSats if the current user's sats have changed
        if (userId && updatedQueueData.currentQueue && updatedQueueData.currentQueue[userId]) {
          const updatedSats = updatedQueueData.currentQueue[userId].sats;
          setUserSats(updatedSats);
        }
      }
    });

    return () => unsubscribe();
  }, [queueId, userId]);

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

        if (!userName && (identifier.startsWith('npub') || identifier.startsWith('nprofile') || identifier.includes('@'))) {
          const nostrData = await getNostrName(identifier);
          name = nostrData.name || identifier;
          pubkey = nostrData.pubkey;
        }

        const newUserId = await addUserToQueue(queueId, name, pubkey, 0, observation);
        setUserId(newUserId);
        setUserJoined(true);
        setUserName(name);
        setUserPubkey(pubkey);

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

  const handlePaymentSuccess = () => {
    getQueueData(queueId).then(updatedQueueData => {
      if (updatedQueueData) {
        updateQueueState(updatedQueueData);
      }
    });
  };

  const sortedQueue = [...queue].sort((a, b) => {
    if (b.sats !== a.sats) {
      return b.sats - a.sats;
    }
    return a.createdAt - b.createdAt;
  });

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
        <div className="w-full md:w-1/2 flex flex-col h-[calc(100vh-12rem)]">
          <Card className="shadow-lg flex-grow">
            {!userJoined ? (
              <>
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
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">Welcome, {userName}!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-lg mb-2">Your current position: {userSats} sats ({sortedQueue.findIndex(item => item.id === userId) + 1} of {sortedQueue.length})</p>
                    <Button 
                      onClick={handleLogout}
                      variant="destructive"
                      className="w-full"
                    >
                      Logout
                    </Button>
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold mb-4">
                      {selectedUserId && selectedUserId !== userId 
                        ? `Add Sats to ${sortedQueue.find(item => item.id === selectedUserId)?.name}'s Position`
                        : 'Add Sats to Your Position'}
                    </h3>
                    <LightningQRCode 
                      lnurl={lnurl} 
                      queueId={queueId}
                      userId={selectedUserId || userId}
                      onPaymentSuccess={handlePaymentSuccess}
                      pubkey={userPubkey}
                    />
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        <div className="w-full md:w-1/2 flex flex-col h-[calc(100vh-12rem)]">
          <Card className="shadow-lg flex-grow">
            <CardHeader>
              <CardTitle className="text-2xl">Queue Status</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col">
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

              <div className="flex-grow overflow-y-auto pr-2">
                {sortedQueue.length === 0 ? (
                  <p className="text-center text-gray-500">No one in queue yet</p>
                ) : (
                  <ul className="space-y-2">
                    {sortedQueue.map((item, index) => (
                      <li key={index} className="border-b py-2">
                        <div className="grid grid-cols-4 gap-2 items-center">
                          <span className="font-medium truncate">{item.name}</span>
                          <span className="text-sm text-gray-500 text-center">{new Date(item.createdAt).toLocaleTimeString()}</span>
                          <span className="text-sm text-gray-500 text-right">{item.sats} sats</span>
                          <Button
                            onClick={() => {
                              setSelectedUserId(item.id);
                            }}
                            variant="outline"
                            size="icon"
                            className="ml-auto h-6 w-6"
                          >
                            +
                          </Button>
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
      </div>
      <Footer />
    </div>
  )
}
