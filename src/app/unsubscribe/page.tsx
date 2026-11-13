'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, Loader2, ShieldOff } from 'lucide-react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing your opt-out request...');
  const [details, setDetails] = useState<{ businessName?: string; email?: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing unsubscribe token.');
      return;
    }

    fetch(`/api/outreach/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.unsubscribed) {
          setStatus('success');
          setDetails({ businessName: data.businessName, email: data.email });
          setMessage('You have been successfully unsubscribed from future outreach messages.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Unable to process unsubscribe link.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error processing unsubscribe request.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-crm-lightGrey/40 dark:bg-crm-navySurface">
          {status === 'loading' ? (
            <Loader2 className="w-6 h-6 animate-spin text-crm-blue dark:text-crm-periwinkle" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-crm-blue dark:text-crm-periwinkle" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-crm-orangeRed dark:text-crm-coral" />
          )}
        </div>

        <h1 className="text-lg font-bold text-crm-navy dark:text-white flex items-center justify-center gap-2">
          <ShieldOff className="w-4 h-4 text-crm-indigo dark:text-crm-sky/80" />
          Email Opt-Out Preference
        </h1>

        <p className="text-xs text-crm-indigo dark:text-crm-sky leading-relaxed">{message}</p>

        {details && (
          <div className="p-3 rounded-xl bg-crm-lightGrey/30 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-indigo dark:text-crm-sky/80">
            <p className="font-semibold text-crm-navy dark:text-white">{details.businessName}</p>
            <p>{details.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-crm-indigo dark:text-crm-sky">
          Processing request...
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}

