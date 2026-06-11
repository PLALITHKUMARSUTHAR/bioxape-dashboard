import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCategories, getTrending, getPosts } from '../api/forum';
import CategoryCard from '../components/forum/CategoryCard';
import PostCard from '../components/forum/PostCard';
import SearchBar from '../components/forum/SearchBar';

export default function ForumPage({ currentUser, onPromptLogin }) {
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [latestPosts, setLatestPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, trendRes, postsRes] = await Promise.all([
          getCategories(),
          getTrending(),
          getPosts({ sort: 'latest', limit: 10 })
        ]);
        setCategories(catRes.data?.data || []);
        setTrending(trendRes.data?.data || []);
        setLatestPosts(postsRes.data?.data || []);
      } catch (err) {
        console.error('Error fetching forum home data:', err);
        setError('Could not load forum data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleStartDiscussion = () => {
    if (!currentUser) {
      onPromptLogin();
    } else {
      navigate('/forum/new');
    }
  };

  const handleSearch = (query) => {
    if (query) {
      navigate(`/forum?search=${encodeURIComponent(query)}`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text3)' }}>
        <p>Loading BioXape Community Forum...</p>
      </div>
    );
  }

  return (
    <div className="bx-wrap">
      {/* Hero Section */}
      <div className="forum-hero">
        <h1>BioXape Community Forum</h1>
        <p>Engage with global experts, researchers, and enthusiasts. Share discoveries, discuss methodologies, and explore biotechnology together.</p>
      </div>

      <div className="forum-layout">
        {/* Main Content Area */}
        <div className="forum-content">
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px' }}>Forum Categories</h2>
          </div>
          {error && <div style={{ color: 'var(--red)', marginBottom: '20px' }}>{error}</div>}
          <div className="category-grid" style={{ marginBottom: '40px' }}>
            {categories.map((cat) => (
              <CategoryCard key={cat._id} category={cat} />
            ))}
          </div>

          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px' }}>Latest Discussions</h2>
          </div>
          <div className="posts-list">
            {latestPosts.length === 0 ? (
              <p style={{ color: 'var(--text4)' }}>No discussions found.</p>
            ) : (
              latestPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="forum-sidebar">
          <button className="btn-cta" onClick={handleStartDiscussion}>
            + Start Discussion
          </button>

          <div className="sidebar-widget">
            <h3>Search Forum</h3>
            <SearchBar onSearch={handleSearch} />
          </div>

          <div className="sidebar-widget">
            <h3>Trending This Week</h3>
            <div className="trending-list">
              {trending.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text4)' }}>No trending posts this week.</p>
              ) : (
                trending.map((post) => (
                  <Link key={post._id} to={`/forum/post/${post._id}`} className="trending-item">
                    <div className="trending-title">{post.title}</div>
                    <div className="trending-meta">
                      {post.category?.name} • 👁 {post.views} views
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-widget">
            <h3>Popular Tags</h3>
            <div className="tags-cloud">
              <span className="tag-badge" onClick={() => navigate('/forum?tag=Genomics')}>#Genomics</span>
              <span className="tag-badge" onClick={() => navigate('/forum?tag=CRISPR')}>#CRISPR</span>
              <span className="tag-badge" onClick={() => navigate('/forum?tag=Research')}>#Research</span>
              <span className="tag-badge" onClick={() => navigate('/forum?tag=Biopharma')}>#Biopharma</span>
              <span className="tag-badge" onClick={() => navigate('/forum?tag=AI')}>#AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
