'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const [lineName, setLineName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const router = useRouter()

  const createLine = async (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically make an API call to create the line
    // For now, we'll just generate a random UUID and redirect
    const uuid = Math.random().toString(36).substring(2, 15)
    router.push(`/${uuid}`)
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Create a Line</CardTitle>
          <CardDescription>Enter line details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createLine} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lineName">Line Name</Label>
              <Input
                id="lineName"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                placeholder="Enter line name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletAddress">Wallet Address</Label>
              <Input
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter wallet address"
                required
              />
            </div>
            <Button type="submit" className="w-full">Create Line</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
