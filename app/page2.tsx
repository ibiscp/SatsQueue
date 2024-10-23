'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Check, Copy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function QueueCreator() {
  const [queueName, setQueueName] = useState('')
  const [lightningInvoice, setLightningInvoice] = useState('')
  const [queueLink, setQueueLink] = useState('')
  const [error, setError] = useState('')

  const createQueue = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setQueueLink('')

    if (!queueName || !lightningInvoice) {
      setError('Please fill in all fields')
      return
    }

    try {
      // In a real application, this would be an API call to your backend
      const response = await mockCreateQueue(queueName, lightningInvoice)
      setQueueLink(response.queueLink)
    } catch (err) {
      setError('Failed to create queue. Please try again.')
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(queueLink)
      .then(() => alert('Link copied to clipboard!'))
      .catch(() => alert('Failed to copy link. Please try again.'))
  }

  // Mock function to simulate API call
  const mockCreateQueue = async (name: string, invoice: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
    return { queueLink: `https://example.com/queue/${name.toLowerCase().replace(/\s+/g, '-')}` }
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Create a Queue</CardTitle>
          <CardDescription>Set up a new queue and receive payments via Lightning Network</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createQueue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="queueName">Queue Name</Label>
              <Input
                id="queueName"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                placeholder="Enter queue name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lightningInvoice">Lightning Invoice Address</Label>
              <Input
                id="lightningInvoice"
                value={lightningInvoice}
                onChange={(e) => setLightningInvoice(e.target.value)}
                placeholder="Enter Lightning invoice address"
                required
              />
            </div>
            <Button type="submit" className="w-full">Create Queue</Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {queueLink && (
            <Alert className="mt-4">
              <Check className="h-4 w-4" />
              <AlertTitle>Queue Created Successfully!</AlertTitle>
              <AlertDescription className="mt-2">
                <p>Share this link with others to join the queue:</p>
                <div className="flex items-center mt-2">
                  <Input value={queueLink} readOnly className="flex-grow" />
                  <Button variant="outline" size="icon" className="ml-2" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}