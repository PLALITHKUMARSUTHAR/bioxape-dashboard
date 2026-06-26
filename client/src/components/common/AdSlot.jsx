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
      // Disable ads for paid users (Basic, Pro, Elite, Institutional) or admin/editor staff roles
      isPaidUser = ['basic', 'pro', 'elite', 'institutional'].includes(tier) || ['admin', 'editor'].includes(role);
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

  const isSidebar = slotKey === 'SIDEBAR';
  const sizeClass = isSidebar ? 'ad-slot-300x250' : 'ad-slot-728x90';
  
  // Custom user-friendly labels matching the main page
  const labelMap = {
    HOMEPAGE: 'Ad Space: Leaderboard 1 (728×90)',
    SIDEBAR: 'Ad Space: Sidebar (300×250)',
    FORUM_FEED: 'Ad Space: Forum Feed (728×90)',
    ARTICLE_TOP: 'Ad Space: Article Top (728×90)',
    ARTICLE_MID1: 'Ad Space: Article Mid 1 (728×90)',
    ARTICLE_MID2: 'Ad Space: Article Mid 2 (728×90)',
    ARTICLE_BOTTOM: 'Ad Space: Article Bottom (728×90)',
    TOOLS_RESULT: 'Ad Space: Tools Result (728×90)'
  };
  const labelText = labelMap[slotKey] || `Ad Space: ${slotKey} (728×90)`;

  if (isSidebar) {
    return (
      <div className={`widget bx-ad-sidebar-widget ${className}`} id={`bx-ad-sidebar-widget-${slotKey}`}>
        <div className="bx-ad-header">
          <span className="ad-pill bx-ad-pill-no-margin">Ad</span>
        </div>
        <div className={`ad-slot placeholder ${sizeClass}`} data-slot-key={slotKey}>
          <span className="ad-placeholder-label">{labelText}</span>
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-bar ${className}`} id={`bx-ad-bar-${slotKey}`}>
      <div className="bx-ad-flex-center" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '730px', alignItems: 'center' }}>
          <span className="ad-pill">Ad</span>
        </div>
        <div className={`ad-slot placeholder ${sizeClass}`} data-slot-key={slotKey}>
          <span className="ad-placeholder-label">{labelText}</span>
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  );
}
