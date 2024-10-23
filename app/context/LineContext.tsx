'use client'

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react'
import Cookies from 'js-cookie'

type LineContextType = {
  setLineName: (name: string, uuid: string) => void
  getLineName: (uuid: string) => string | null
}

const LineContext = createContext<LineContextType | undefined>(undefined)

export function LineProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Record<string, string>>({})

  useEffect(() => {
    // Load lines from cookies on initial render
    const savedLines = Cookies.get('lines')
    if (savedLines) {
      setLines(JSON.parse(savedLines))
    }
  }, [])

  const setLineName = (name: string, uuid: string) => {
    const newLines = { ...lines, [uuid]: name }
    setLines(newLines)
    // Save to cookies
    Cookies.set('lines', JSON.stringify(newLines), { expires: 7 }) // Expires in 7 days
  }

  const getLineName = (uuid: string) => {
    return lines[uuid] || null
  }

  return (
    <LineContext.Provider value={{ setLineName, getLineName }}>
      {children}
    </LineContext.Provider>
  )
}

export function useLine() {
  const context = useContext(LineContext)
  if (context === undefined) {
    throw new Error('useLine must be used within a LineProvider')
  }
  return context
}