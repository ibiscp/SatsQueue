'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QRCodeSVG } from 'qrcode.react'
import { useLine } from '../../context/LineContext'

type QueueItem = {
  identifier: string;
  timestamp: number;
}

export default function QueuePage({ params }: { params: { uuid: string } }) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [qrValue, setQrValue] = useState('')
  const { getLineName } = useLine()
  const [lineName, setLineName] = useState<string | null>(null)

  useEffect(() => {
    const name = getLineName(params.uuid)
    setLineName(name)
    setQrValue(`${window.location.origin}/${name || params.uuid}`)
    
    // Here you would typically fetch the queue data from an API
    // For now, we'll use mock data
    setQueue([
      { identifier: "Alice", timestamp: Date.now() - 300000 },
      { identifier: "Bob", timestamp: Date.now() - 200000 },
      { identifier: "Charlie", timestamp: Date.now() - 100000 },
    ])
  }, [params.uuid, getLineName])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex flex-col items-center py-8 px-4">
      <header className="w-full max-w-md mb-8 text-white text-center">
        <h1 className="text-3xl font-bold mb-2">SatsQueue</h1>
        <p className="text-xl">Queue Management</p>
      </header>
      
      <Card className="w-full max-w-md mb-4 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Scan to Enter the Line</CardTitle>
          {lineName && <CardDescription>Line: {lineName}</CardDescription>}
        </CardHeader>
        <CardContent className="flex justify-center">
          <QRCodeSVG value={qrValue} size={200} />
        </CardContent>
      </Card>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Current Line Status</CardTitle>
          <CardDescription>Queue ID: {params.uuid}</CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-center text-gray-500">No one in line yet</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((item, index) => (
                <li key={index} className="flex justify-between items-center border-b py-2">
                  <span className="font-medium">{item.identifier}</span>
                  <span className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
