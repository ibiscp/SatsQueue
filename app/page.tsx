'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQueue } from './context/QueueContext'

export default function Home() {
  const [queueName, setQueueName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const router = useRouter()
  const { setQueueName:setQueueNameContext } = useQueue()

  const createQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    const uuid = Math.random().toString(36).substring(2, 15)
    setQueueNameContext(queueName, uuid)
    router.push(`/queue/${uuid}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex flex-col items-center py-8 px-4">
      <header className="w-full max-w-md mb-8 text-white text-center">
        <h1 className="text-3xl font-bold mb-2">SatsQueue</h1>
        <p className="text-xl">Create your lightning-fast queue!</p>
      </header>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create a Queue</CardTitle>
          <CardDescription>Enter queue details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createQueue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="queueName" className="text-lg">Queue Name</Label>
              <Input
                id="queueName"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                placeholder="Enter queue name"
                required
                className="text-lg py-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletAddress" className="text-lg">Wallet Address</Label>
              <Input
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter wallet address"
                required
                className="text-lg py-2"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-2">Create Queue</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
