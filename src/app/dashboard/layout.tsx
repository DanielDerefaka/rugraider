"use client"

import type { ReactNode } from "react"
import { useWalletContext } from "@/contexts/WalletContext"
import { AppSidebar } from "@/components/Main/Sidebar"
import { Topbar } from "@/components/Main/Topbar"

interface DashboardLayoutProps {
  children: ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { error: walletError, clearError } = useWalletContext()

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="fixed inset-y-0 left-0 z-20">
        <AppSidebar />
      </div>
      <div className="flex flex-col flex-1">
        <div className="fixed top-0 right-0 left-[250px] z-10">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto pt-[60px] ml-[250px]">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout;