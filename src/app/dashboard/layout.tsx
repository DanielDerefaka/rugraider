"use client"

import type { ReactNode } from "react"


import { useWalletContext } from "@/contexts/WalletContext"
import { AppSidebar } from "@/components/Main/Sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Topbar } from "@/components/Main/Topbar"

interface DashboardLayoutProps {
  children: ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { error: walletError, clearError } = useWalletContext()

  return (
    <div className="flex ">
    <AppSidebar />
    <div className="flex-1 flex flex-col">
      <Topbar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  </div>
  )
}

export default DashboardLayout;