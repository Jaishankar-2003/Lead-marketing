import React from 'react';
import { LocationStatus, QualificationStatus, WebsiteStatus, ScoreLevel } from '../../types';

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
  const variantStyles = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-md ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
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
      return <Badge variant="cyan">Web Dev</Badge>;
    case 'PC_REPAIR':
      return <Badge variant="amber">PC Repair</Badge>;
    case 'NETWORKING_AMC':
      return <Badge variant="emerald">Network & AMC</Badge>;
    default:
      return null;
  }
};

