"use client";

import { useState, type ReactNode } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { AppSidebar } from "@/components/Main/Sidebar";
import { Topbar } from "@/components/Main/Topbar";
import { useMediaQuery } from "@/hooks/use-media-query";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { error: walletError, clearError } = useWalletContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="flex flex-col h-screen">
      <Topbar onMenuToggle={toggleMobileMenu} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar 
          isMobileOpen={isMobileOpen} 
          onMobileClose={closeMobileMenu}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;