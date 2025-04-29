'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/contexts/NotificationContext';
import { 
  AlertCircle, 
  AlertTriangle, 
  Check, 
  XCircle, 
  AlertOctagon, 
  BellRing, 
  Coins, 
  Wallet,
  BarChart2, 
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NotificationProps {
  notification: {
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    type: 'transaction' | 'system' | 'token' | 'risk';
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    link?: string;
  };
}

export const NotificationItem: React.FC<NotificationProps> = ({ notification }) => {
  const { markAsRead, removeNotification } = useNotifications();

  const getIcon = () => {
    // Type-based icons
    switch (notification.type) {
      case 'transaction':
        return <Wallet className="h-5 w-5 text-blue-500" />;
      case 'token':
        return <Coins className="h-5 w-5 text-purple-500" />;
      case 'risk':
        // Risk level icons
        if (notification.riskLevel) {
          switch (notification.riskLevel) {
            case 'low':
              return <AlertCircle className="h-5 w-5 text-green-500" />;
            case 'medium':
              return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'high':
              return <XCircle className="h-5 w-5 text-orange-500" />;
            case 'critical':
              return <AlertOctagon className="h-5 w-5 text-red-500" />;
            default:
              return <Shield className="h-5 w-5 text-amber-500" />;
          }
        }
        return <BarChart2 className="h-5 w-5 text-amber-500" />;
      case 'system':
      default:
        return <BellRing className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRiskLevelBadge = () => {
    if (!notification.riskLevel) return null;
    
    const variants = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <Badge className={cn('ml-2 font-medium', variants[notification.riskLevel])}>
        {notification.riskLevel.charAt(0).toUpperCase() + notification.riskLevel.slice(1)}
      </Badge>
    );
  };

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      window.location.href = notification.link;
    }
  };
  
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });

  return (
    <div 
      className={cn(
        'p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted group relative',
        notification.read ? 'bg-transparent' : 'bg-primary/5 border-l-2 border-primary'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h4 className="text-sm font-medium text-foreground truncate">{notification.title}</h4>
            {getRiskLevelBadge()}
            {!notification.read && (
              <div className="h-2 w-2 rounded-full bg-primary ml-2"></div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
          
          <div className="flex items-center mt-2 justify-between">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark read
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};