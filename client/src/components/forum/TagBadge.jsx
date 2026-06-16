import React from 'react';

export default function TagBadge({ tag, active, onClick }) {
  const isCharacterisation = ['Discussion', 'Question', 'Research Update', 'Announcement'].includes(tag);
  
  if (isCharacterisation) {
    const icons = {
      'Discussion': '💬',
      'Question': '❓',
      'Research Update': '🔬',
      'Announcement': '📢'
    };
    const styles = {
      'Discussion': { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' },
      'Question': { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
      'Research Update': { backgroundColor: '#e2fdf5', color: '#0f766e', border: '1px solid #ccfbf1' },
      'Announcement': { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' }
    };
    
    return (
      <span 
        className={`tag-badge characterisation-badge ${active ? 'active' : ''}`}
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          fontWeight: '600',
          fontSize: '12px',
          cursor: onClick ? 'pointer' : 'default',
          textTransform: 'none',
          ...styles[tag]
        }}
        onClick={onClick}
      >
        <span>{icons[tag]}</span>
        <span>{tag}</span>
      </span>
    );
  }

  return (
    <span 
      className={`tag-badge ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      #{tag}
    </span>
  );
}
