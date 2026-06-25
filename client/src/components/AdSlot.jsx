import React, { useEffect, useState } from 'react';

const CMS_API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || !window.location.hostname
  ? 'http://localhost:5000/api' 
  : 'https://bioxape-backend.onrender.com/api';

export default function AdSlot({ slotKey, slotName, width = '728px', height = '90px' }) {
  const [adHtml, setAdHtml] = useState(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchAdConfig = async () => {
      try {
        const res = await fetch(CMS_API + '/site/config/adsense_slots');
        const data = await res.json();
        if (!active) return;
        const slots = data?.data?.data || {};
        const config = slots[slotKey];
        if (config && config.active && config.code) {
          setAdHtml(config.code);
          setIsActive(true);
        }
      } catch (err) {
        console.warn('Failed to load AdSlot config:', err);
      }
    };
    fetchAdConfig();
    return () => {
      active = false;
    };
  }, [slotKey]);

  // Execute script tags in injected code after load
  useEffect(() => {
    if (isActive && adHtml) {
      const container = document.getElementById(`react-ad-container-${slotKey}`);
      if (container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });
      }
    }
  }, [isActive, adHtml, slotKey]);

  return (
    <div className="ad-bar" style={{ margin: '24px 0', width: '100%' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: width, alignItems: 'center' }}>
          <span className="ad-pill">Ad</span>
        </div>
        {isActive ? (
          <div 
            id={`react-ad-container-${slotKey}`}
            className="ad-slot"
            style={{ width, height, maxWidth: '100%', display: 'block' }}
            dangerouslySetInnerHTML={{ __html: adHtml }}
          />
        ) : (
          <div 
            className="ad-slot placeholder"
            style={{ width, height, maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Ad Space: {slotName || slotKey}
          </div>
        )}
      </div>
    </div>
  );
}
