/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { getQueueData, removeUserFromQueue, listenToQueueUpdates } from '@/lib/firebase';
import { sendNostrPrivateMessage } from '@/lib/nostr';
import Footer from '@/components/ui/footer';
import { QrCode, Minus } from 'lucide-react';

type QueueItem = {
  name: string;
  id: string;
  createdAt: number;
  sats: number;
  nostrPubkey?: string;
  comment?: string;
}

type RemovedItem = QueueItem & {
  servedAt: number;
}

export default function Admin() {
  const { uuid } = useParams<{ uuid: string }>();
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [qrValue, setQrValue] = useState('')
  const [queueName, setQueueName] = useState<string | null>(null)
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([])
  const [showQRModal, setShowQRModal] = useState(false)

  useEffect(() => {
    const fetchQueueData = async () => {
      if (uuid) {
        const queueData = await getQueueData(uuid);
        if (queueData) {
          updateQueueState(queueData);
          setQueueName(queueData.name || uuid);
        }

        setQrValue(`${window.location.origin}/${queueData?.name?.toLowerCase() || uuid}`);

        // Set up real-time listener
        const unsubscribe = listenToQueueUpdates(uuid, updateQueueState);
        return () => unsubscribe();
      }
    };

    fetchQueueData();
  }, [uuid])

  const updateQueueState = (queueData: any) => {
    setQueue(Object.values(queueData.currentQueue || {}));
    const sortedRemovedItems = Object.values(queueData.servedCustomers || {}) as RemovedItem[];
    sortedRemovedItems.sort((a, b) => b.servedAt - a.servedAt);
    setRemovedItems(sortedRemovedItems);
  };

  // Sort the queue by sats (descending) and then by createdAt (ascending)
  const sortedQueue = [...queue].sort((a, b) => {
    if (b.sats !== a.sats) {
      return b.sats - a.sats;
    }
    return a.createdAt - b.createdAt;
  });
  
  const handleCallNext = async () => {
    if (sortedQueue.length > 0 && uuid) {
      const removedItem = sortedQueue[0];
      await removeUserFromQueue(uuid, removedItem.id);

      // Send Nostr message to the called user
      if (removedItem.nostrPubkey && queueName) {
        const message = `🔔 You've been called for ${queueName}!`;
        try {
          await sendNostrPrivateMessage(removedItem.nostrPubkey, message);
          console.log('Nostr message sent successfully');
        } catch (error) {
          console.error('Error sending Nostr message:', error);
        }
      }
    }
  };

  const handleCallUser = async (user: QueueItem) => {
    if (!uuid) {
      console.warn('Missing queue ID');
      return;
    }

    try {
      await removeUserFromQueue(uuid, user.id);

      if (user.nostrPubkey && queueName) {
        const message = `🔔 You've been called for ${queueName}!`;
        try {
          await sendNostrPrivateMessage(user.nostrPubkey, message);
        } catch (error) {
          console.error('Error sending Nostr message:', error);
        }
      } else {
        console.log('Skipping Nostr message - missing pubkey or queue name:', { 
          hasPubkey: !!user.nostrPubkey,
          hasQueueName: !!queueName 
        });
      }
    } catch (error) {
      console.error('Error removing user from queue:', error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center py-4 sm:py-8 px-2 sm:px-4">
      <div className="w-full max-w-6xl p-2 sm:p-6 flex-grow">
        <div className="flex justify-center items-center mb-4 sm:mb-8 relative">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <a
              href={qrValue}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base sm:text-xl font-medium text-gray-800 hover:bg-gray-200 transition-colors duration-200 bg-gray-100 rounded-lg px-3 sm:px-6 py-2 sm:py-3 truncate max-w-[280px] sm:max-w-none text-center"
            >
              {qrValue}
            </a>
            <Button
              onClick={() => setShowQRModal(true)}
              variant="outline"
              className="flex items-center gap-2 h-[40px] sm:h-[48px]"
            >
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowQRModal(false)}>
            <div className="bg-white p-4 sm:p-8 rounded-lg max-w-[90vw]" onClick={e => e.stopPropagation()}>
              <QRCodeSVG value={qrValue} size={Math.min(window.innerWidth * 0.8, 400)} />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 sm:gap-8 h-auto sm:h-[calc(100vh-16rem)]">
          <Card className="w-full md:w-1/2 shadow-lg flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl lg:hover:scale-105 lg:active:scale-100 active:shadow-md">
            <CardHeader className="text-center p-3 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl">Current Queue</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col p-2 sm:p-4">
              <div className="p-2 sm:p-4">
                <Button
                  className="w-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 ease-in-out focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:outline-none text-sm sm:text-base py-2 sm:py-3"
                  onClick={handleCallNext}
                >
                  Call next
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 sm:px-4">
                {sortedQueue.length === 0 ? (
                  <p className="text-center text-gray-500">No one in queue yet</p>
                ) : (
                  <ul className="space-y-2">
                    {sortedQueue.map((item, index) => (
                      <li key={index} className="border-b py-2">
                        <div className="grid grid-cols-4 gap-1 sm:gap-2 items-center text-sm sm:text-base">
                          <span className="font-medium truncate">{item.name}</span>
                          <span className="text-xs sm:text-sm text-gray-500 text-center">{new Date(item.createdAt).toLocaleTimeString()}</span>
                          <span className="text-xs sm:text-sm text-gray-500 text-right">{item.sats} sats</span>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleCallUser(item)}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm py-1 w-6 sm:w-8"
                            >
                              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                        {item.comment && (
                          <div className="text-xs sm:text-sm text-gray-500 mt-1 text-center">
                            {item.comment}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="w-full md:w-1/2 shadow-lg flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl lg:hover:scale-105 lg:active:scale-100 active:shadow-md">
            <CardHeader className="text-center p-3 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl">Recently Called</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-2 sm:p-4">
              {removedItems.length === 0 ? (
                <p className="text-center text-gray-500">No one called yet</p>
              ) : (
                <>
                  <div className="mb-4 p-2 bg-gray-100 rounded">
                    <div className="text-2xl sm:text-3xl font-bold mb-2 text-center">{removedItems[0].name}</div>
                    <div className="text-xs sm:text-sm text-gray-500 text-center">
                      <span>{removedItems[0].sats} sats</span>
                      <span className="mx-2">•</span>
                      <span>Waited: {Math.floor((removedItems[0].servedAt - removedItems[0].createdAt) / 60000)} minutes</span>
                    </div>
                    {removedItems[0].comment && (
                      <div className="text-xs sm:text-sm text-gray-500 mt-2 text-center italic">
                        {removedItems[0].comment}
                      </div>
                    )}
                  </div>

                  <div className="h-[calc(100%-8rem)] overflow-y-auto pr-2">
                    <ul className="space-y-4">
                      {removedItems.slice(1).map((item, index) => (
                        <li key={index} className="border-b py-2">
                          <div className="grid grid-cols-3 gap-1 sm:gap-2 items-center">
                            <span className="truncate text-sm sm:text-base">{item.name}</span>
                            <span className="text-xs sm:text-sm text-gray-500 text-center">
                              {Math.floor((item.servedAt - item.createdAt) / 60000)} min
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500 text-right">{item.sats} sats</span>
                          </div>
                          {item.comment && (
                            <div className="text-xs sm:text-sm text-gray-500 mt-1 text-center">
                              {item.comment}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  )
}
