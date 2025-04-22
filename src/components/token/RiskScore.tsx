'use client';

import React from 'react';
import { RiskLevel } from '@/types/token';
import { formatRiskScore, getRiskColor, getRiskBgColor } from '@/lib/utils';

interface RiskScoreProps {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBadge?: boolean;
  className?: string;
}

export const RiskScore: React.FC<RiskScoreProps> = ({
  score,
  level,
  size = 'md',
  showLabel = true,
  showBadge = true,
  className = '',
}) => {
  // Determine the arc color based on risk level
  const arcColor = (() => {
    switch (level) {
      case 'low':
        return '#10b981'; // green
      case 'medium':
        return '#f59e0b'; // amber
      case 'high':
        return '#ef4444'; // red
      case 'critical':
        return '#7f1d1d'; // dark red
      default:
        return '#6b7280'; // gray
    }
  })();
  
  // Calculate the circumference of the circle
  const radius = size === 'sm' ? 16 : size === 'md' ? 24 : 32;
  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the filled portion of the circle based on the risk score (0-100)
  const fillPercent = score / 100;
  const dashOffset = circumference * (1 - fillPercent);
  
  // Determine the text size
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg';
  const labelSize = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm';
  
  // Determine the badge size
  const badgeSize = size === 'sm' ? 'text-[10px] px-1' : size === 'md' ? 'text-xs px-2 py-0.5' : 'text-sm px-2 py-1';
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Background circle */}
        <svg
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
          className="transform -rotate-90"
        >
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Foreground circle (risk indicator) */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="transparent"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Risk score text */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`font-bold ${textSize}`}>{formatRiskScore(score)}</span>
          {showLabel && (
            <span className={`${labelSize} text-gray-500 -mt-1`}>Risk</span>
          )}
        </div>
      </div>
      
      {/* Risk level badge */}
      {showBadge && (
        <div className={`mt-1 rounded-full ${badgeSize} font-medium ${getRiskBgColor(level)}`}>
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </div>
      )}
    </div>
  );
};