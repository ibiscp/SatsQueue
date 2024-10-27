import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { getQueueData, removeUserFromQueue, listenToQueueUpdates } from '@/lib/firebase';
import { sendNostrPrivateMessage } from '@/lib/nostr';
import Footer from '@/components/ui/footer';
import { QrCode } from 'lucide-react';

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

export default function Admin() {
  const { uuid } = useParams<{ uuid: string }>();
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [qrValue, setQrValue] = useState('')
  const { getQueueName } = useQueue()
  const [queueName, setQueueName] = useState<string | null>(null)
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([])
  const [showQRModal, setShowQRModal] = useState(false)

  useEffect(() => {
    const fetchQueueData = async () => {
      if (uuid) {
        const name = getQueueName(uuid)
        setQueueName(name)
        setQrValue(`${window.location.origin}/${name || uuid}`)
        
        const queueData = await getQueueData(uuid);
        if (queueData) {
          updateQueueState(queueData);
        }

        // Set up real-time listener
        const unsubscribe = listenToQueueUpdates(uuid, updateQueueState);
        return () => unsubscribe();
      }
    };

    fetchQueueData();
  }, [uuid, getQueueName])

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
      // The queue will be updated automatically through the real-time listener

      // Send Nostr message to the called user
      if (removedItem.nostrPubkey) {
        const message = `🔔 You've been called for ${queueName || uuid}! Please come to the counter. 🎉`;
        try {
          await sendNostrPrivateMessage(removedItem.nostrPubkey, message);
          console.log('Nostr message sent successfully');
        } catch (error) {
          console.error('Error sending Nostr message:', error);
        }
      }
    }
  };
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center">
      <div className="w-full max-w-6xl p-6 flex-grow">
        <div className="flex justify-center items-center mb-8 relative">
          <div className="flex items-center gap-4">
            <a
              href={qrValue}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-medium text-gray-800 hover:bg-gray-200 transition-colors duration-200 bg-gray-100 rounded-lg px-6 py-3"
            >
              {qrValue}
            </a>
            <Button
              onClick={() => setShowQRModal(true)}
              variant="outline"
              className="flex items-center gap-2 h-[48px]"
            >
              <QrCode className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowQRModal(false)}>
            <div className="bg-white p-8 rounded-lg" onClick={e => e.stopPropagation()}>
              <QRCodeSVG value={qrValue} size={400} />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 h-[calc(100vh-16rem)]">
          <Card className="w-full md:w-1/2 shadow-lg flex flex-col">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Current Queue</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              <div className="h-full overflow-y-auto pr-2">
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
            <div className="p-4 border-t mt-auto">
              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 ease-in-out focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:outline-none"
                onClick={handleCallNext}
              >
                Call next
              </Button>
            </div>
          </Card>

          <Card className="w-full md:w-1/2 shadow-lg flex flex-col">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Recently Called</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              {removedItems.length === 0 ? (
                <p className="text-center text-gray-500">No one called yet</p>
              ) : (
                <>
                  {/* Current person called shown outside scroll area */}
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

                  {/* Scrollable list of previously called people */}
                  <div className="h-[calc(100%-8rem)] overflow-y-auto pr-2">
                    <ul className="space-y-4">
                      {removedItems.slice(1).map((item, index) => (
                        <li key={index} className="border-b py-2">
                          <div className="grid grid-cols-3 gap-2 items-center">
                            <span className="truncate">{item.name}</span>
                            <span className="text-sm text-gray-500 text-center">
                              {Math.floor((item.servedAt - item.createdAt) / 60000)} min
                            </span>
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
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
