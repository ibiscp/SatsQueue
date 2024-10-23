'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type QueueItem = {
  identifier: string;
  timestamp: number;
}

export default function Line({ params }: { params: { uuid: string } }) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [identifier, setIdentifier] = useState('')

  const joinLine = (e: React.FormEvent) => {
    e.preventDefault()
    if (identifier.trim()) {
      const newItem = { identifier: identifier.trim(), timestamp: Date.now() }
      setQueue([...queue, newItem])
      setIdentifier('')
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Current Line State</CardTitle>
          <CardDescription>Line ID: {params.uuid}</CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p>No one in line yet</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((item, index) => (
                <li key={index} className="flex justify-between items-center border-b py-2">
                  <span>{item.identifier}</span>
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join the Line</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={joinLine} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifier</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your identifier"
                required
              />
            </div>
            <Button type="submit" className="w-full">Enter Line</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
