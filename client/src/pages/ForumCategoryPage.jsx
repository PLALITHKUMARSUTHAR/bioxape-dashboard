import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPosts, getCategories } from '../api/forum';
import PostCard from '../components/forum/PostCard';
import TagBadge from '../components/forum/TagBadge';

export default function ForumCategoryPage({ currentUser, onPromptLogin }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('latest'); // latest, top, comments
  const [selectedTag, setSelectedTag] = useState('');
  const [tags, setTags] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [catRes, postsRes] = await Promise.all([
          getCategories(),
          getPosts({
            category: slug,
            page,
            limit: 15,
            sort,
            tag: selectedTag
          })
        ]);

        const found = catRes.data?.data?.find(c => c.slug === slug);
        if (found) {
          setCategory(found);
        } else {
          setError('Category not found');
        }

        setPosts(postsRes.data?.data || []);
        setTotalPages(postsRes.data?.totalPages || 1);

        // Collect tags from posts for filter chips
        const postTags = new Set();
        (postsRes.data?.data || []).forEach(p => {
          if (p.tags) p.tags.forEach(t => postTags.add(t));
        });
        setTags(Array.from(postTags));
      } catch (err) {
        console.error('Error loading category data:', err);
        setError('Failed to load category data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, page, sort, selectedTag]);

  const handleStartDiscussion = () => {
    navigate('/new', { state: { defaultCategoryId: category?._id } });
  };

  if (error) {
    return (
      <div className="bx-wrap" style={{ padding: '40px 0', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--red)' }}>{error}</h2>
        <Link to="/" style={{ marginTop: '20px', display: 'inline-block' }}>Back to Forum</Link>
      </div>
    );
  }

  return (
    <div className="bx-wrap">
      {/* Category Header */}
      {category && (
        <div className="category-header" style={{ borderLeftColor: category.color }}>
          <h1>
            <span style={{ fontSize: '36px' }}>{category.icon}</span> {category.name}
          </h1>
          <p>{category.description}</p>
        </div>
      )}

      {/* Filter and Sort Bar */}
      <div className="filter-bar">
        <div className="sort-tabs">
          <button 
            className={`sort-tab ${sort === 'latest' ? 'active' : ''}`}
            onClick={() => { setSort('latest'); setPage(1); }}
          >
            Latest
          </button>
          <button 
            className={`sort-tab ${sort === 'top' ? 'active' : ''}`}
            onClick={() => { setSort('top'); setPage(1); }}
          >
            Top Voted
          </button>
          <button 
            className={`sort-tab ${sort === 'comments' ? 'active' : ''}`}
            onClick={() => { setSort('comments'); setPage(1); }}
          >
            Most Discussed
          </button>
        </div>

        <button className="btn-cta" style={{ width: 'auto', padding: '8px 16px' }} onClick={handleStartDiscussion}>
          + Start Discussion
        </button>
      </div>

      <div className="forum-layout">
        {/* Posts List */}
        <div className="forum-content">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>Loading discussions...</p>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--text3)', fontSize: '16px', marginBottom: '14px' }}>No discussions here yet.</p>
              <button className="btn-submit-post" onClick={handleStartDiscussion}>Be the first to post!</button>
            </div>
          ) : (
            <>
              <div className="posts-list">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    className="btn-page"
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button 
                    className="btn-page"
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="forum-sidebar">
          {tags.length > 0 && (
            <div className="sidebar-widget">
              <h3>Filter by Tag</h3>
              <div className="tags-cloud">
                <span 
                  className={`tag-badge ${!selectedTag ? 'active' : ''}`}
                  onClick={() => { setSelectedTag(''); setPage(1); }}
                >
                  # All Tags
                </span>
                {tags.map((tag, idx) => (
                  <TagBadge 
                    key={idx}
                    tag={tag}
                    active={selectedTag === tag}
                    onClick={() => { setSelectedTag(tag); setPage(1); }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-widget">
            <h3>Guidelines</h3>
            <p style={{ fontSize: '13px', color: 'var(--text3)', lineHeight: '1.5' }}>
              We encourage respectful, scientific discussions. Keep research-backed citations where applicable, and respect community diversity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
