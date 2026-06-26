import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCategories, getTrending, getPosts, searchPosts } from '../api/forum';
import CategoryCard from '../components/forum/CategoryCard';
import PostCard from '../components/forum/PostCard';
import SearchBar from '../components/forum/SearchBar';
import AdSlot from '../components/AdSlot';

export default function ForumPage({ currentUser, onPromptLogin }) {
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [latestPosts, setLatestPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || '';
  const tagQuery = searchParams.get('tag') || '';

  useEffect(() => {
    const loadData = async () => {
      try {
        const postsPromise = searchQuery 
          ? searchPosts(searchQuery) 
          : getPosts({ sort: 'latest', limit: 10, tag: tagQuery });

        const [catRes, trendRes, postsRes] = await Promise.all([
          getCategories(),
          getTrending(),
          postsPromise
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
  }, [location.search]);

  const handleStartDiscussion = () => {
    navigate('/new');
  };

  const handleSearch = (query) => {
    if (query) {
      navigate(`/?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="bx-wrap">
      {/* Hero Section */}
      <div className="forum-hero">
        <svg className="hero-dna-svg" viewBox="0 0 65 130" fill="none" style={{ position: 'absolute', top: '22px', right: '22px', opacity: 0.25, width: '65px', height: '130px' }}>
          <path d="M12 6 Q54 26 12 53 Q54 80 12 107 Q54 127 12 145" stroke="var(--g200)" strokeWidth="2.5" fill="none"/>
          <path d="M53 6 Q11 26 53 53 Q11 80 53 107 Q11 127 53 145" stroke="var(--accent)" strokeWidth="2.5" fill="none"/>
          <line x1="12" y1="26" x2="53" y2="26" stroke="var(--g100)" strokeWidth="1.5" opacity=".5"/>
          <line x1="53" y1="53" x2="12" y2="53" stroke="var(--g100)" strokeWidth="1.5" opacity=".5"/>
          <line x1="12" y1="80" x2="53" y2="80" stroke="var(--g100)" strokeWidth="1.5" opacity=".5"/>
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <picture style={{ height: '46px', display: 'block' }}>
            <source media="(max-width: 768px)" srcSet="/assets/icon_mobile.png" />
            <img src="/assets/icon.png" alt="BioXApe Icon" style={{ height: '46px', width: 'auto', objectFit: 'contain', display: 'block' }} />
          </picture>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <picture style={{ height: '38px', display: 'block' }}>
              <source media="(max-width: 768px)" srcSet="/assets/main_logo_mobile.png" />
              <img src="/assets/main_logo.png" alt="BioXApe" style={{ height: '38px', width: 'auto', objectFit: 'contain', display: 'block' }} />
            </picture>
            <h1 style={{ fontSize: '24px', margin: 0, fontWeight: '700' }}>
              Community Forum
            </h1>
          </div>
        </div>
        <p>Engage with global experts, researchers, and enthusiasts. Share discoveries, discuss methodologies, and explore biotechnology together.</p>
      </div>

      <AdSlot slotKey="HOMEPAGE" className="forum-homepage-ad" />

      <div className="forum-layout">
        {/* Main Content Area */}
        <div className="forum-content">
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px' }}>Forum Categories</h2>
          </div>
          {error && <div style={{ color: 'var(--red)', marginBottom: '20px' }}>{error}</div>}
          <div className="category-grid" style={{ marginBottom: '40px' }}>
            {loading ? (
              <p style={{ color: 'var(--text3)' }}>Loading categories...</p>
            ) : (
              categories.map((cat) => (
                <CategoryCard key={cat._id} category={cat} />
              ))
            )}
          </div>

          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px' }}>Latest Discussions</h2>
          </div>
          <div className="posts-list">
            {loading ? (
              <p style={{ color: 'var(--text3)' }}>Loading discussions...</p>
            ) : latestPosts.length === 0 ? (
              <p style={{ color: 'var(--text4)' }}>No discussions found.</p>
            ) : (
              latestPosts.map((post, index) => (
                <React.Fragment key={post._id}>
                  <PostCard post={post} />
                  {(index + 1) % 5 === 0 && (
                    <AdSlot slotKey="FORUM_FEED" />
                  )}
                </React.Fragment>
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
              {loading ? (
                <p style={{ fontSize: '13px', color: 'var(--text4)' }}>Loading...</p>
              ) : trending.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text4)' }}>No trending posts this week.</p>
              ) : (
                trending.map((post) => (
                  <Link key={post._id} to={`/post/${post._id}`} className="trending-item">
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
              <span className="tag-badge" onClick={() => navigate('/?tag=Genomics')}>#Genomics</span>
              <span className="tag-badge" onClick={() => navigate('/?tag=CRISPR')}>#CRISPR</span>
              <span className="tag-badge" onClick={() => navigate('/?tag=Research')}>#Research</span>
              <span className="tag-badge" onClick={() => navigate('/?tag=Biopharma')}>#Biopharma</span>
              <span className="tag-badge" onClick={() => navigate('/?tag=AI')}>#AI</span>
            </div>
          </div>

          <AdSlot slotKey="SIDEBAR" />
        </div>
      </div>
    </div>
  );
}
