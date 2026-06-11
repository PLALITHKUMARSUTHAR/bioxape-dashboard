import React from 'react';

export default function TagBadge({ tag, active, onClick }) {
  return (
    <span 
      className={`tag-badge ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      #{tag}
    </span>
  );
}
