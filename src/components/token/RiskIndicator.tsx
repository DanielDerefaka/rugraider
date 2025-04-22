'use client';

import React from 'react';
import { RiskLevel } from '@/types/token';
import { getRiskColor, getRiskBgColor } from '@/lib/utils';

interface RiskIndicatorProps {
  level: RiskLevel;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'dot' | 'text' | 'pill';
  className?: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  level,
  size = 'md',
  variant = 'badge',
  className = '',
}) => {
  // Get size classes
  const sizeClasses = (() => {
    switch (size) {
      case 'xs':
        return {
          dot: 'w-2 h-2',
          text: 'text-xs',
          badge: 'text-xs px-1 py-0.5',
          pill: 'text-xs px-2 py-0.5',
        };
      case 'sm':
        return {
          dot: 'w-3 h-3',
          text: 'text-sm',
          badge: 'text-sm px-2 py-1',
          pill: 'text-sm px-2.5 py-0.5',
        };
      case 'md':
        return {
          dot: 'w-4 h-4',
          text: 'text-base',
          badge: 'text-sm px-2.5 py-1',
          pill: 'text-sm px-3 py-1',
        };
      case 'lg':
        return {
          dot: 'w-5 h-5',
          text: 'text-lg',
          badge: 'text-base px-3 py-1.5',
          pill: 'text-base px-4 py-1',
        };
      default:
        return {
          dot: 'w-3 h-3',
          text: 'text-sm',
          badge: 'text-sm px-2 py-1',
          pill: 'text-sm px-2.5 py-0.5',
        };
    }
  })();

  // Capitalize risk level text
  const levelText = level.charAt(0).toUpperCase() + level.slice(1);

  // Render appropriate variant
  switch (variant) {
    case 'dot':
      return (
        <div 
          className={`rounded-full ${sizeClasses.dot} ${className}`}
          style={{ backgroundColor: level === 'low' ? '#10b981' : level === 'medium' ? '#f59e0b' : level === 'high' ? '#ef4444' : '#7f1d1d' }}
        />
      );

    case 'text':
      return (
        <span className={`font-medium ${sizeClasses.text} ${getRiskColor(level)} ${className}`}>
          {levelText}
        </span>
      );

    case 'pill':
      return (
        <span className={`rounded-full font-medium ${sizeClasses.pill} ${getRiskBgColor(level)} ${className}`}>
          {levelText}
        </span>
      );

    case 'badge':
    default:
      return (
        <span className={`rounded font-medium ${sizeClasses.badge} ${getRiskBgColor(level)} ${className}`}>
          {levelText}
        </span>
      );
  }
};