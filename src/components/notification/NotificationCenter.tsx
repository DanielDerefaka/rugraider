'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { Bell, X, Settings, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface NotificationCenterProps {
  maxHeight?: string;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  maxHeight = 'max-h-[400px]',
  className = '',
}) => {
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    clearAllNotifications,
    settings,
    updateSettings
  } = useNotifications();
  
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks for the popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, isMobile]);

  // Mark all as read when opening notifications
  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  }, [open, unreadCount, markAllAsRead]);

  const toggleOpen = () => {
    setOpen(!open);
  };

  const NotificationContent = () => (
    <Tabs defaultValue="notifications" className="w-full" onValueChange={setActiveTab}>
      <TabsList className="w-full grid grid-cols-2 mb-4">
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      
      {activeTab === 'notifications' && (
        <div className="flex items-center justify-end gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={markAllAsRead}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={clearAllNotifications}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        </div>
      )}
      
      <TabsContent value="notifications" className={`${maxHeight} overflow-y-auto`}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="settings">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Enable notifications</span>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
            />
          </div>
          
          <div className="space-y-2">
            <span className="block text-sm font-medium">Risk level threshold</span>
            <div className="flex gap-2 flex-wrap">
              {['low', 'medium', 'high', 'critical'].map((level) => (
                <Button
                  key={level}
                  variant={settings.riskLevelThreshold === level ? "default" : "outline"}
                  size="sm"
                  className="h-8"
                  onClick={() => updateSettings({ riskLevelThreshold: level as any })}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <span className="block text-sm font-medium">Notification types</span>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Transaction alerts</span>
                <Switch
                  checked={settings.transactionNotifications}
                  onCheckedChange={(checked) => 
                    updateSettings({ transactionNotifications: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">New tokens</span>
                <Switch
                  checked={settings.newTokens}
                  onCheckedChange={(checked) => 
                    updateSettings({ newTokens: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Risk score changes</span>
                <Switch
                  checked={settings.riskChanges}
                  onCheckedChange={(checked) => 
                    updateSettings({ riskChanges: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">System announcements</span>
                <Switch
                  checked={settings.systemAnnouncements}
                  onCheckedChange={(checked) => 
                    updateSettings({ systemAnnouncements: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  // Mobile drawer implementation
  if (isMobile) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={toggleOpen}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
        
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="border-b p-4">
              <div className="flex items-center justify-between">
                <DrawerTitle>Notifications</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="p-4">
              <NotificationContent />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }
  
  // Desktop popover implementation
  return (
    <div className="relative" ref={popoverRef}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className={cn("w-96 p-4", className)} 
          align="end"
          side="bottom"
        >
          <NotificationContent />
        </PopoverContent>
      </Popover>
    </div>
  );
};