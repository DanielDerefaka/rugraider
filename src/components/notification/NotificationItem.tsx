'use client';

import React from 'react';
import { Notification } from '@/types/notification';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const { markAsRead, removeNotification } = useNotifications();
  const router = useRouter();
  
  // Handle notification click - mark as read and navigate if applicable
  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type and data
    if (notification.type === 'token' && notification.data?.tokenAddress) {
      router.push(`/tokens/${notification.data.tokenAddress}`);
    } else if (notification.type === 'transaction' && notification.data?.transactionId) {
      // Open transaction in a new tab
      window.open(`https://solscan.io/tx/${notification.data.transactionId}`, '_blank');
    }
  };
  
  // Get notification icon based on type
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'risk':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      
      case 'transaction':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        );
      
      case 'token':
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      
      case 'system':
      default:
        return (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };
  
  // Get notification indicator color based on priority
  const getPriorityIndicator = () => {
    switch (notification.priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
      default:
        return 'bg-blue-500';
    }
  };
  
  return (
    <div
      className={`relative flex p-4 border-b cursor-pointer transition-colors ${
        notification.read ? 'bg-white' : 'bg-blue-50'
      } hover:bg-gray-50`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityIndicator()}`} />
      )}
      
      {/* Notification icon */}
      <div className="flex-shrink-0 mr-3">
        {getNotificationIcon()}
      </div>
      
      {/* Notification content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
          <div className="flex items-center">
            <span className="text-xs text-gray-500">
              {formatRelativeTime(notification.timestamp / 1000)}
            </span>
            <button
              className="ml-2 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
          {notification.message}
        </p>
        
        {/* Additional data based on notification type */}
        {notification.type === 'token' && notification.data?.tokenSymbol && (
          <div className="mt-1 text-xs text-gray-500">
            Token: {notification.data.tokenSymbol}
            {notification.data.riskLevel && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                notification.data.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                notification.data.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                notification.data.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                'bg-red-100 text-red-800'
              }`}>
                {notification.data.riskLevel.charAt(0).toUpperCase() + notification.data.riskLevel.slice(1)} Risk
              </span>
            )}
          </div>
        )}
        
        {notification.type === 'transaction' && notification.data?.transactionId && (
          <div className="mt-1 text-xs text-gray-500">
            TX: {notification.data.transactionId.substring(0, 8)}...{notification.data.transactionId.substring(notification.data.transactionId.length - 8)}
          </div>
        )}
      </div>
    </div>
  );
};