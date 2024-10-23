'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { FedimintWallet } from '@fedimint/core-web'

// // Create the Wallet client
// const wallet = new FedimintWallet()

// // Open the wallet (should be called once in the application lifecycle)
// await wallet.open()

// // Join a Federation (if not already open)
// if (!wallet.isOpen()) {
//   const inviteCode = 'fed11qgqpw9thwvaz7t...'
//   await wallet.joinFederation(inviteCode)
// }

type QueueItem = {
  name: string;
  sats: number;
}

export default function Component() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [newName, setNewName] = useState('')
  const [newSats, setNewSats] = useState('')

  const joinQueue = (e: React.FormEvent) => {
    e.preventDefault()
    const sats = parseInt(newSats)
    if (isNaN(sats) || sats <= 0) {
      alert('Please enter a valid number of sats')
      return
    }
    const existingIndex = queue.findIndex(item => item.name === newName)
    if (existingIndex !== -1) {
      const confirmTopUp = window.confirm(`There's already a user named "${newName}" in the queue. Do you want to top up their sats instead?`)
      if (confirmTopUp) {
        const newQueue = [...queue]
        newQueue[existingIndex].sats += sats
        setQueue(newQueue.sort((a, b) => b.sats - a.sats))
      } else {
        // If user doesn't want to top up, we don't modify the queue
        return
      }
    } else {
      const newItem = { name: newName, sats }
      const newQueue = [...queue, newItem].sort((a, b) => b.sats - a.sats)
      setQueue(newQueue)
    }
    setNewSats('')
    setNewName('')
  }

  const topUp = (name: string) => {
    setNewName(name) 
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex space-x-8">
        <div className="w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Join Queue or Top Up</CardTitle>
              <CardDescription>Enter your name and deposit sats to join the queue or top up</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={joinQueue} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sats">Sats to Deposit</Label>
                  <Input
                    id="sats"
                    type="number"
                    value={newSats}
                    onChange={(e) => setNewSats(e.target.value)}
                    placeholder="Enter amount of sats"
                    required
                  />
                </div>
                <Button type="submit">Join Queue</Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Current Queue</CardTitle>
              <CardDescription>People currently in the queue</CardDescription>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <p>No one in the queue yet</p>
              ) : (
                <ul className="space-y-2">
                  {queue.map((item, index) => (
                    <li key={index} className="flex justify-between items-center border-b py-2">
                      <span>{item.name}</span>
                      <div className="flex items-center space-x-2">
                        <span>{item.sats} sats</span>
                        <Button onClick={() => topUp(item.name)} size="sm">Top Up</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}