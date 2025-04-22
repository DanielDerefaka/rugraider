"use client"

import type React from "react"

import { useState } from "react"
import { Menu, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { NotificationCenter } from "@/components/notification/NotificationCenter"
import { WalletConnectButton } from "../wallet/WalletConnectButton"

interface TopbarProps {
  className?: string
}

export function Topbar({ className }: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality
    console.log("Searching for:", searchQuery)
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="hidden md:block">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-4">
        {/* Search - only on larger screens */}
        <form onSubmit={handleSearch} className="relative hidden md:block w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tokens..."
            className="w-full bg-muted/40 border-none pl-9 focus-visible:ring-1 focus-visible:ring-primary/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Notifications */}
        <NotificationCenter />

        {/* Wallet Connect */}
        <WalletConnectButton showBalance={true} />
      </div>
    </header>
  )
}
