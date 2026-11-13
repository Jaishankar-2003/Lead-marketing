'use client';

import React from 'react';
import { LocationStatus, QualificationStatus, WebsiteStatus, ScoreLevel } from '@/types/open-marketing';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'slate' | 'orange' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'sm',
  className = '',
}) => {
  // Premium CRM Light Mode Soft Badge System (Dark readable text on soft pastel backgrounds)
  const variantStyles = {
    // Success / Completed / Healthy -> Green
    emerald: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    // Primary / Found -> Indigo
    blue: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
    // Information / Network -> Cyan
    cyan: 'bg-[#CFFAFE] text-[#0E7490] border-[#A5F3FC]',
    // Warning / Attention / Pending -> Amber
    amber: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
    // Danger / Broken / Destructive -> Red
    red: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
    // Intelligence / Web Dev Opportunity -> Violet / Purple
    purple: 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]',
    // Secondary Warning / PC Repair -> Orange
    orange: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]',
    // Neutral -> Slate
    slate: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-md whitespace-nowrap shrink-0 transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const WebsiteStatusBadge: React.FC<{ status: WebsiteStatus }> = ({ status }) => {
  switch (status) {
    case 'WEBSITE_FOUND':
      return <Badge variant="blue">Website Found</Badge>;
    case 'VERIFIED_NO_WEBSITE':
      return <Badge variant="purple">No Website (Lead!)</Badge>;
    case 'WEBSITE_BROKEN':
      return <Badge variant="red">Website Broken</Badge>;
    case 'WEBSITE_UNAVAILABLE':
      return <Badge variant="orange">Unavailable</Badge>;
    case 'NEEDS_VERIFICATION':
    default:
      return <Badge variant="slate">Needs Verification</Badge>;
  }
};

export const LocationStatusBadge: React.FC<{ status: LocationStatus }> = ({ status }) => {
  switch (status) {
    case 'EXACT_AREA_MATCH':
      return <Badge variant="emerald">Exact Area</Badge>;
    case 'NEARBY_AREA_MATCH':
      return <Badge variant="cyan">Nearby Area</Badge>;
    case 'CITY_ONLY_MATCH':
      return <Badge variant="amber">City Only</Badge>;
    case 'LOCATION_UNVERIFIED':
    default:
      return <Badge variant="slate">Unverified</Badge>;
  }
};

export const QualificationBadge: React.FC<{ status: QualificationStatus }> = ({ status }) => {
  switch (status) {
    case 'QUALIFIED':
      return <Badge variant="emerald">Qualified</Badge>;
    case 'NEEDS_VERIFICATION':
      return <Badge variant="amber">Needs Verify</Badge>;
    case 'UNQUALIFIED':
    default:
      return <Badge variant="slate">Unqualified</Badge>;
  }
};

export const RatingBadge: React.FC<{ level: ScoreLevel; label?: string }> = ({ level, label }) => {
  const text = label ? `${label}: ${level}` : level;
  switch (level) {
    case 'HIGH':
      return <Badge variant="emerald">{text}</Badge>;
    case 'MEDIUM':
      return <Badge variant="blue">{text}</Badge>;
    case 'LOW':
      return <Badge variant="amber">{text}</Badge>;
    case 'NONE':
    default:
      return <Badge variant="slate">{text}</Badge>;
  }
};

export const OpportunityBadge: React.FC<{ opportunity?: string }> = ({ opportunity }) => {
  switch (opportunity) {
    case 'WEB_DEV':
      return <Badge variant="purple">Web Dev</Badge>;
    case 'PC_REPAIR':
      return <Badge variant="orange">PC Repair</Badge>;
    case 'NETWORKING_AMC':
      return <Badge variant="cyan">Network &amp; AMC</Badge>;
    default:
      return null;
  }
};
