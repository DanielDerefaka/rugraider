"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  AlertCircle,
  BarChart2,
  ChevronDown,
  Coins,
  FileText,
  Home,
  Layers,
  Moon,
  Search,
  Settings,
  Shield,
  Star,
  Sun,
  Users,
  Wallet,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface NavItemProps {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  isActive?: boolean
  canFavorite?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

function NavItem({
  href,
  icon,
  children,
  isActive,
  canFavorite = false,
  isFavorite = false,
  onToggleFavorite,
}: NavItemProps) {
  return (
    <div className="relative group">
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive ? "bg-primary/10 text-primary" : "text-foreground/80 hover:text-foreground hover:bg-muted",
        )}
      >
        <span className="text-foreground/70">{icon}</span>
        <span>{children}</span>
      </Link>
      {canFavorite && (
        <button
          onClick={onToggleFavorite}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
            isFavorite && "opacity-100 text-amber-500",
          )}
        >
          <Star className="h-4 w-4" />
          <span className="sr-only">{isFavorite ? "Remove from favorites" : "Add to favorites"}</span>
        </button>
      )}
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className="py-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "transform rotate-180")} />
      </button>
      {isOpen && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [favorites, setFavorites] = React.useState<string[]>(["/dashboard/tokens"])
  const [searchQuery, setSearchQuery] = React.useState("")

  const toggleFavorite = (path: string) => {
    if (favorites.includes(path)) {
      setFavorites(favorites.filter((p) => p !== path))
    } else {
      setFavorites([...favorites, path])
    }
  }

  return (
    <div className="w-64 h-screen flex flex-col border-r bg-card ">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">SolGuard</h2>
            <p className="text-xs text-muted-foreground">Solana Security Dashboard</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 bg-muted/40 border-muted"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-2.5 top-2.5 text-xs text-muted-foreground">⌘ K</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-2 px-2">
        <div className="space-y-1">
          <NavItem href="/dashboard" icon={<Home className="h-4 w-4" />} isActive={pathname === "/dashboard"}>
            Dashboard
          </NavItem>

          <NavItem
            href="/dashboard/notifications"
            icon={<AlertCircle className="h-4 w-4" />}
            isActive={pathname === "/dashboard/notifications"}
          >
            Notifications
          </NavItem>
        </div>

        <Section title="Analysis" defaultOpen={true}>
          <NavItem
            href="/dashboard/tokens"
            icon={<Coins className="h-4 w-4" />}
            isActive={pathname === "/dashboard/tokens"}
            canFavorite
            isFavorite={favorites.includes("/dashboard/tokens")}
            onToggleFavorite={() => toggleFavorite("/dashboard/tokens")}
          >
            Token Analysis
          </NavItem>

          <NavItem
            href="/dashboard/wallet"
            icon={<Wallet className="h-4 w-4" />}
            isActive={pathname === "/dashboard/wallet"}
            canFavorite
            isFavorite={favorites.includes("/dashboard/wallet")}
            onToggleFavorite={() => toggleFavorite("/dashboard/wallet")}
          >
            Wallet Security
          </NavItem>

          <NavItem
            href="/dashboard/transactions"
            icon={<BarChart2 className="h-4 w-4" />}
            isActive={pathname === "/dashboard/transactions"}
            canFavorite
            isFavorite={favorites.includes("/dashboard/transactions")}
            onToggleFavorite={() => toggleFavorite("/dashboard/transactions")}
          >
            Transaction Monitor
          </NavItem>

          <NavItem
            href="/dashboard/risk-checker"
            icon={<Shield className="h-4 w-4" />}
            isActive={pathname === "/dashboard/risk-checker"}
            canFavorite
            isFavorite={favorites.includes("/dashboard/risk-checker")}
            onToggleFavorite={() => toggleFavorite("/dashboard/risk-checker")}
          >
            Risk Checker
          </NavItem>
        </Section>

        <Section title="Resources">
          <NavItem
            href="/dashboard/reports"
            icon={<FileText className="h-4 w-4" />}
            isActive={pathname === "/dashboard/reports"}
          >
            Security Reports
          </NavItem>

          <NavItem
            href="/dashboard/templates"
            icon={<Layers className="h-4 w-4" />}
            isActive={pathname === "/dashboard/templates"}
          >
            Analysis Templates
          </NavItem>
        </Section>

        <Section title="Community">
          <NavItem
            href="/dashboard/users"
            icon={<Users className="h-4 w-4" />}
            isActive={pathname === "/dashboard/users"}
          >
            Users
          </NavItem>
        </Section>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">User Account</p>
              <p className="text-xs text-muted-foreground">user@example.com</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between rounded-md border p-2 bg-muted/40">
          <span className="text-xs font-medium text-muted-foreground">Appearance</span>
          <div className="flex gap-1">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" />
              <span className="sr-only">Light mode</span>
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" />
              <span className="sr-only">Dark mode</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
