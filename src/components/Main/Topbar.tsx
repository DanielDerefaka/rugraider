"use client";

import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notification/NotificationCenter";
import { WalletConnectButton } from "../wallet/WalletConnectButton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";

interface TopbarProps {
  className?: string;
  onMenuToggle?: () => void;
}

export function Topbar({ className, onMenuToggle }: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
    if (isMobile) {
      setIsSearchOpen(false);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}
       
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-4">
        {/* Search - different behavior on mobile */}
        {isMobile ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <DialogContent className="top-0 translate-y-0 max-w-none w-full rounded-none border-x-0 border-t-0 sm:max-w-none">
                <form onSubmit={handleSearch} className="relative p-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-0 top-0 h-9 w-9"
                      onClick={() => setIsSearchOpen(false)}
                    >
                      <X className="h-5 w-5" />
                      <span className="sr-only">Close</span>
                    </Button>
                    <Input
                      type="search"
                      placeholder="Search tokens..."
                      className="w-full bg-muted/40 border-none pl-12 pr-4 py-5 text-base focus-visible:ring-1 focus-visible:ring-primary/30"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <form onSubmit={handleSearch} className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tokens..."
              className="w-full bg-muted/40 border-none pl-9 focus-visible:ring-1 focus-visible:ring-primary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        )}

        {/* Notifications */}
        <NotificationCenter />

        {/* Wallet Connect - simplified on mobile */}
        <WalletConnectButton showBalance={true} />
      </div>
    </header>
  );
}