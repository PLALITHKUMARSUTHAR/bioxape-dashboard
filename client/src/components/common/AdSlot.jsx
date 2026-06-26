import React, { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT, AD_SLOTS } from '../../config/adConfig';

export default function AdSlot({ slotKey, className = '', disabled }) {
  const initialized = useRef(false);

  // Retrieve user subscription status from localStorage
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('bioxape_user') : null;
  let isPaidUser = false;
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const tier = (user?.subscriptionTier || 'free').toLowerCase();
      const role = (user?.role || '').toLowerCase();
      // Disable ads for paid users (Basic, Pro, Elite, Institutional)
      isPaidUser = ['basic', 'pro', 'elite', 'institutional'].includes(tier);
    } catch (e) {
      console.warn('Error parsing user profile from localStorage:', e);
    }
  }

  if (disabled || isPaidUser) {
    return null;
  }

  const slotId = AD_SLOTS[slotKey];
  if (!slotId) {
    console.warn(`AdSlot: Invalid slotKey "${slotKey}" provided.`);
    return null;
  }

  useEffect(() => {
    if (!initialized.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        initialized.current = true;
      } catch (e) {
        console.error('AdSense initialization error:', e);
      }
    }
  }, []);

  const wrapperStyle = {
    textAlign: 'center',
    margin: '1.5rem auto',
    width: '100%',
    overflow: 'hidden'
  };

  return (
    <div className={`ad-wrapper ${className}`} style={wrapperStyle}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-slot-key={slotKey}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
