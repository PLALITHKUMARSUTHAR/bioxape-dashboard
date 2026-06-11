import React from 'react';
import { Link } from 'react-router-dom';

export default function CategoryCard({ category }) {
  const { name, slug, description, icon, color, postCount } = category;

  return (
    <Link to={`/category/${slug}`} className="cat-card-link">
      <div className="cat-card" style={{ borderTopColor: color || '#27a363' }}>
        <div className="cat-icon">{icon || '🧬'}</div>
        <div className="cat-info">
          <h2>{name}</h2>
        </div>
        <div className="cat-stats">
          <span className="cat-badge-count">
            {postCount || 0} {postCount === 1 ? 'post' : 'posts'}
          </span>
        </div>
      </div>
    </Link>
  );
}
