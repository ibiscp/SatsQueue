'use client'

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react'
import Cookies from 'js-cookie'

type QueueContextType = {
  setQueueName: (name: string, uuid: string) => void
  getQueueName: (uuid: string) => string | null
}

const QueueContext = createContext<QueueContextType | undefined>(undefined)

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queues, setQueues] = useState<Record<string, string>>({})

  useEffect(() => {
    // Load queues from cookies on initial render
    const savedQueues = Cookies.get('queues')
    if (savedQueues) {
      setQueues(JSON.parse(savedQueues))
    }
  }, [])

  const setQueueName = (name: string, uuid: string) => {
    const newQueues = { ...queues, [uuid]: name }
    setQueues(newQueues)
    // Save to cookies
    Cookies.set('queues', JSON.stringify(newQueues), { expires: 7 }) // Expires in 7 days
  }

  const getQueueName = (uuid: string) => {
    return queues[uuid] || null
  }

  return (
    <QueueContext.Provider value={{ setQueueName, getQueueName }}>
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const context = useContext(QueueContext)
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider')
  }
  return context
}
