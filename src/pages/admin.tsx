import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { getQueueData, removeUserFromQueue, listenToQueueUpdates } from '@/lib/firebase';
import { sendNostrPrivateMessage } from '@/lib/nostr';

type QueueItem = {
  name: string;
  id: string;
  createdAt: number;
  sats: number;
  nostrPubkey?: string;
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
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8">
        <Card className="w-full md:w-1/3 shadow-lg flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 active:scale-100 active:shadow-md p-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Scan to Enter the Queue</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center items-center flex-grow">
            <QRCodeSVG value={qrValue} size={250} />
            <div className="mt-4 text-center">
              <a
                href={qrValue}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
              >
                {qrValue}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full md:w-1/3 shadow-lg flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 active:scale-100 active:shadow-md p-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Current Queue</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <div className="h-[calc(100vh-24rem)] overflow-y-auto pr-2">
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
          <div className="p-4 border-t">
            <Button
              className="w-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 ease-in-out focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:outline-none"
              onClick={handleCallNext}
            >
              Call next
            </Button>
          </div>
        </Card>

        <Card className="w-full md:w-1/3 shadow-lg flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 active:scale-100 active:shadow-md p-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Recently Called</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <div className="h-[calc(100vh-24rem)] overflow-y-auto pr-2">
              {removedItems.length === 0 ? (
                <p className="text-center text-gray-500">No one called yet</p>
              ) : (
                <ul className="space-y-4">
                  {removedItems.map((item, index) => (
                    <li key={index} className={`border-b py-2 ${index === 0 ? 'bg-gray-100 p-2 rounded' : ''}`}>
                      {index === 0 ? (
                        <>
                          <div className="text-3xl font-bold mb-2 text-center">{item.name}</div>
                          <div className="text-sm text-gray-500 text-center">
                            <span>{item.sats} sats</span>
                            <span className="mx-2">•</span>
                            <span>Waited: {Math.floor((item.servedAt - item.createdAt) / 60000)} minutes</span>
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <span className="truncate">{item.name}</span>
                          <span className="text-sm text-gray-500 text-center">
                            {Math.floor((item.servedAt - item.createdAt) / 60000)} min
                          </span>
                          <span className="text-sm text-gray-500 text-right">{item.sats} sats</span>
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
  )
}
