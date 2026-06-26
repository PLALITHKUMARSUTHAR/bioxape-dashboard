import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import TagBadge from './TagBadge';
import { checkEarlyAccess } from '../../utils/earlyAccess';

export default function PostCard({ post }) {
  const {
    _id,
    title,
    author,
    createdAt,
    tags,
    upvotes = [],
    downvotes = [],
    commentCount = 0,
    views = 0,
    isPinned,
    isLocked,
    category
  } = post;

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('bioxape_user') : null;
  let currentUser = null;
  if (userStr) {
    try {
      currentUser = JSON.parse(userStr);
    } catch (e) {}
  }

  const { isEarlyAccess, isAuthorized, daysRemaining } = checkEarlyAccess(post, currentUser);

  const score = upvotes.length - downvotes.length;
  const authorName = author?.name || 'Anonymous';
  const authorInitial = authorName.charAt(0).toUpperCase();

  const formattedDate = createdAt 
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true })
    : '';

  const cardClass = `post-card ${isEarlyAccess ? 'early-access-card' : ''} ${isEarlyAccess && !isAuthorized ? 'early-access-locked' : ''}`;

  return (
    <div className={cardClass}>
      {isEarlyAccess && (
        <div className="early-access-banner-badge">
          <span className="ea-star">✦</span> Early Access {!isAuthorized && <span className="ea-lock-text">• Premium Only (Unlocks in {daysRemaining} days)</span>}
        </div>
      )}
      <div className={isEarlyAccess && !isAuthorized ? 'early-access-blur-content' : ''}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="post-card-title">
              {isPinned && <span style={{ marginRight: '8px', color: 'var(--amber)' }} title="Pinned">📌</span>}
              <Link to={`/post/${_id}`}>{title}</Link>
              {isLocked && <span style={{ marginLeft: '8px', color: 'var(--red)', fontSize: '14px' }} title="Locked">🔒</span>}
            </h3>
            <div style={{ marginTop: '8px' }} className="tags-cloud">
              {tags && tags.map((t, idx) => (
                <TagBadge key={idx} tag={t} />
              ))}
            </div>
          </div>
          {category && (
            <span 
              style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                padding: '4px 8px', 
                borderRadius: '4px',
                backgroundColor: `${category.color}15`,
                color: category.color
              }}
            >
              {category.icon} {category.name}
            </span>
          )}
        </div>

        <div className="post-card-meta">
          <div className="post-card-author">
            <div className="user-avatar">{authorInitial}</div>
            <span>{authorName}</span>
            {author?.role && ['admin', 'editor', 'author'].includes(author.role) && (
              <span style={{ 
                fontSize: '10px', 
                background: author.role === 'admin' ? 'var(--red-l)' : author.role === 'editor' ? 'var(--blue-l)' : 'var(--accent-l)', 
                color: author.role === 'admin' ? 'var(--red)' : author.role === 'editor' ? 'var(--blue)' : 'var(--accent)', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: 'bold',
                textTransform: 'uppercase',
                marginLeft: '6px',
                display: 'inline-block',
                lineHeight: '1.2'
              }}>
                {author.role}
              </span>
            )}
          </div>
          <span>•</span>
          <span>{formattedDate}</span>
          
          <div className="post-card-stats">
            <div className="stat-item" title="Votes">
              <span>Score:</span>
              <strong>{score}</strong>
            </div>
            <div className="stat-item" title="Comments">
              <span>💬</span>
              <span>{commentCount}</span>
            </div>
            <div className="stat-item" title="Views">
              <span>👁</span>
              <span>{views}</span>
            </div>
          </div>
        </div>
      </div>
      {isEarlyAccess && !isAuthorized && (
        <div className="early-access-overlay-cta">
          <Link to={`/post/${_id}`} className="btn-ea-unlock">
            🔒 Subscribe to Unlock
          </Link>
        </div>
      )}
    </div>
  );
}
