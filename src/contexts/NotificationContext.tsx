'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Notification as NotificationType, NotificationSettings } from '@/types/notification';
// import { generateId } from '@/lib/utils';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
}

// Default notification settings
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  riskLevelThreshold: 'medium',
  transactionNotifications: true,
  newTokens: true,
  riskChanges: true,
  systemAnnouncements: true,
};

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  settings: DEFAULT_SETTINGS,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  removeNotification: () => {},
  clearAllNotifications: () => {},
  updateSettings: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Load notifications from localStorage on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        try {
          setNotifications(JSON.parse(savedNotifications));
        } catch (error) {
          console.error('Error parsing saved notifications:', error);
        }
      }
      
      const savedSettings = localStorage.getItem('notificationSettings');
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch (error) {
          console.error('Error parsing saved notification settings:', error);
        }
      }
    }
  }, []);
  
  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);
  
  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
    }
  }, [settings]);
  
  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // Only add if notifications are enabled and relevant setting is enabled
    if (!settings.enabled) return;
    
    // Check if notification type is enabled in settings
    if (
      (notification.type === 'risk' && !settings.riskChanges) ||
      (notification.type === 'transaction' && !settings.transactionNotifications) ||
      (notification.type === 'token' && !settings.newTokens) ||
      (notification.type === 'system' && !settings.systemAnnouncements)
    ) {
      return;
    }
    
    // Check risk level threshold for risk notifications
    if (
      notification.type === 'risk' && 
      notification.data?.riskLevel && 
      !isRiskLevelAboveThreshold(notification.data.riskLevel, settings.riskLevelThreshold)
    ) {
      return;
    }
    
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: Date.now(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Optional: show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, { body: notification.message });
    }
  };
  
  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };
  
  // Remove a notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  
  // Update notification settings
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  // Helper function to check if a risk level is at or above the threshold
  const isRiskLevelAboveThreshold = (level: string, threshold: string) => {
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const levelIndex = riskLevels.indexOf(level);
    const thresholdIndex = riskLevels.indexOf(threshold);
    
    return levelIndex >= thresholdIndex;
  };
  
  const contextValue: NotificationContextValue = {
    notifications,
    unreadCount,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    updateSettings,
  };
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};
