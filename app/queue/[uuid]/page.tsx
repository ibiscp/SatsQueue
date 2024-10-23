'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QRCodeSVG } from 'qrcode.react'
import { useQueue } from '../../context/QueueContext'
import { Button } from '@/components/ui/button'

type QueueItem = {
  identifier: string;
  timestamp: number;
  sats: number;
}

type RemovedItem = QueueItem & {
  removedAt: number;
}

export default function QueuePage({ params }: { params: { uuid: string } }) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [qrValue, setQrValue] = useState('')
  const { getQueueName } = useQueue()
  const [queueName, setQueueName] = useState<string | null>(null)
  const [removedItems, setRemovedItems] = useState<RemovedItem[]>([])

  useEffect(() => {
    const name = getQueueName(params.uuid)
    setQueueName(name)
    setQrValue(`${window.location.origin}/${name || params.uuid}`)
    
    // Here you would typically fetch the queue data from an API
    // For now, we'll use mock data
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
  }, [params.uuid, getQueueName])

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
        <Card className="w-full md:w-1/3 shadow-lg flex flex-col">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Scan to Enter the Queue</CardTitle>
            {queueName && <CardDescription>Queue: {queueName}</CardDescription>}
          </CardHeader>
          <CardContent className="flex justify-center items-center flex-grow">
            <QRCodeSVG value={qrValue} size={250} />
          </CardContent>
        </Card>

        <Card className="w-full md:w-1/3 shadow-lg flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Current Queue Status</CardTitle>
            <CardDescription>Queue ID: {params.uuid}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <div className="h-[calc(100vh-24rem)] overflow-y-auto pr-2">
              {sortedQueue.length === 0 ? (
                <p className="text-center text-gray-500">No one in line yet</p>
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
          <div className="p-4 border-t">
            <Button
              className="w-full bg-red-500 hover:bg-red-600 text-white"
              onClick={() => {
                if (sortedQueue.length > 0) {
                  const removedItem = sortedQueue[0];
                  const newQueue = sortedQueue.slice(1);
                  setQueue(newQueue);
                  setRemovedItems(prev => [{...removedItem, removedAt: Date.now()}, ...prev.slice(0, 9)]);
                }
              }}
            >
              Remove First from Queue
            </Button>
          </div>
        </Card>

        <Card className="w-full md:w-1/3 shadow-lg flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Recently Removed</CardTitle>
            <CardDescription>Last 10 removed from queue</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <div className="h-[calc(100vh-24rem)] overflow-y-auto pr-2">
              {removedItems.length === 0 ? (
                <p className="text-center text-gray-500">No one removed yet</p>
              ) : (
                <ul className="space-y-4">
                  {removedItems.map((item, index) => (
                    <li key={index} className={`border-b py-2 ${index === 0 ? 'bg-gray-100 p-2 rounded' : ''}`}>
                      <div className={`grid grid-cols-3 gap-2 items-center ${index === 0 ? 'font-bold' : ''}`}>
                        <span className="truncate">{item.identifier}</span>
                        <span className="text-sm text-gray-500 text-center">{item.sats} sats</span>
                        <span className="text-sm text-gray-500 text-right">{new Date(item.removedAt).toLocaleTimeString()}</span>
                      </div>
                      {index === 0 && (
                        <div className="text-sm text-gray-500 mt-1">
                          Removed: {new Date(item.removedAt).toLocaleString()}
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
