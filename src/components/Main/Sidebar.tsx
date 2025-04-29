"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AlertCircle,
  BarChart2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  FileText,
  Home,
  Layers,
  Shield,
  Star,
  Sun,
  Moon,
  Users,
  Wallet,
  X,
  Search,
  Settings,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
  canFavorite?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
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
          isActive
            ? "bg-primary/10 text-primary"
            : "text-foreground/80 hover:text-foreground hover:bg-muted"
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
            isFavorite && "opacity-100 text-amber-500"
          )}
        >
          <Star className="h-4 w-4" />
          <span className="sr-only">
            {isFavorite ? "Remove from favorites" : "Add to favorites"}
          </span>
        </button>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="py-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </button>
      {isOpen && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

interface AppSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ isMobileOpen = false, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [favorites, setFavorites] = React.useState<string[]>([
    "/dashboard/tokens",
  ]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const toggleFavorite = (path: string) => {
    if (favorites.includes(path)) {
      setFavorites(favorites.filter((p) => p !== path));
    } else {
      setFavorites([...favorites, path]);
    }
  };

  const toggleSidebar = () => {
    if (!isMobile) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={cn("p-4 z-10 border-b", isCollapsed && !isMobile && "p-2")}>
        {(!isCollapsed || isMobile) ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Rug Raider</h2>
              <p className="text-xs text-muted-foreground">
                Tokens Risk Dashboard
              </p>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-5 w-5 text-white" />
          </div>
        )}

        {/* Search */}
        {(!isCollapsed || isMobile) && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-muted/40 border-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-2.5 top-2.5 text-xs text-muted-foreground">
              ⌘ K
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={cn("flex-1 z-10 overflow-auto py-2 px-2", isCollapsed && !isMobile && "px-1")}>
        <div className="space-y-1">
          <NavItem
            href="/dashboard"
            icon={<Home className="h-4 w-4" />}
            isActive={pathname === "/dashboard"}
          >
            {(!isCollapsed || isMobile) && "Dashboard"}
          </NavItem>

          <NavItem
            href="/dashboard/notifications"
            icon={<AlertCircle className="h-4 w-4" />}
            isActive={pathname === "/dashboard/notifications"}
          >
            {(!isCollapsed || isMobile) && "Notifications"}
          </NavItem>
        </div>

        {(!isCollapsed || isMobile) && (
          <>
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
                onToggleFavorite={() =>
                  toggleFavorite("/dashboard/transactions")
                }
              >
                Transaction Monitor
              </NavItem>

              <NavItem
                href="/dashboard/risk-checker"
                icon={<Shield className="h-4 w-4" />}
                isActive={pathname === "/dashboard/risk-checker"}
                canFavorite
                isFavorite={favorites.includes("/dashboard/risk-checker")}
                onToggleFavorite={() =>
                  toggleFavorite("/dashboard/risk-checker")
                }
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
          </>
        )}
      </div>

      {/* Footer */}
      <div className={cn("border-t p-4", isCollapsed && !isMobile && "p-2")}>
        {(!isCollapsed || isMobile) ? (
          <>
            <div className="flex items-center justify-between mb-4">
              
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

            {/* Theme Toggle */}
            <div className="flex items-center justify-between rounded-md border p-2 bg-muted/40">
              <span className="text-xs font-medium text-muted-foreground">
                Appearance
              </span>
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
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src="/placeholder.svg?height=32&width=32"
                alt="User"
              />
              <AvatarFallback>D</AvatarFallback>
            </Avatar>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        )}
      </div>
    </>
  );

  // For desktop view
  if (!isMobile) {
    return (
      <div
        className={cn(
          "h-screen flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-background border rounded-full w-6 h-6 p-0 z-10"
          onClick={toggleSidebar}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  // For mobile view
  return (
    <>
      <Drawer open={isMobileOpen} onOpenChange={onMobileClose}>
        <DrawerContent className="h-[95%]">
          <div className="relative h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={onMobileClose}
            >
              <X className="h-5 w-5" />
            </Button>
            {sidebarContent}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}