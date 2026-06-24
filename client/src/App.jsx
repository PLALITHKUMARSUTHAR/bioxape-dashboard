import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';

// Import Pages
import ForumPage from './pages/ForumPage';
import ForumCategoryPage from './pages/ForumCategoryPage';
import ForumPostPage from './pages/ForumPostPage';
import NewPostPage from './pages/NewPostPage';
import ToolsHub from './pages/ToolsHub';
import ToolPageWrapper from './pages/tools/ToolPageWrapper';

const SITE_API_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/forum', '') 
  : (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || !window.location.hostname
      ? 'http://localhost:5000/api' 
      : 'https://bioxape-backend.onrender.com/api'
  );

const routerBasename = window.location.pathname.startsWith('/forum') ? '/forum' : '/';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [tickerItems, setTickerItems] = useState([
    { label: "BREAKING", text: "FDA approves first CRISPR-based therapy for sickle cell disease" },
    { label: "RESEARCH", text: "AlphaFold 3 predicts protein-ligand interactions with 91% accuracy" },
    { label: "INDUSTRY", text: "Biocon reports 34% YoY growth in biosimilar exports" },
    { label: "FUNDING", text: "DBT allocates Rs 1,200 Cr for synthetic biology hubs across IITs" }
  ]);

  useEffect(() => {
    // Prevent access to tools under /forum/tools, redirecting to /tools instead
    if (window.location.pathname.startsWith('/forum/tools')) {
      const newPath = window.location.pathname.replace('/forum/tools', '/tools');
      window.location.href = newPath + window.location.search + window.location.hash;
    }
  }, []);

  useEffect(() => {
    // Read session from shared localStorage automatically
    const token = localStorage.getItem('bioxape_token');
    const userStr = localStorage.getItem('bioxape_user');
    
    if (token && userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Invalid user schema in localStorage:', e);
        localStorage.removeItem('bioxape_token');
        localStorage.removeItem('bioxape_user');
      }
    }
  }, []);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const response = await fetch(`${SITE_API_URL}/site/news-feed?limit=30`);
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          setTickerItems(result.data.map(item => ({
            label: item.category.toUpperCase(),
            text: item.title
          })));
        } else {
          const fallbackRes = await fetch(`${SITE_API_URL}/site/ticker`);
          const fallbackResult = await fallbackRes.json();
          if (fallbackResult.success && fallbackResult.data && fallbackResult.data.items) {
            setTickerItems(fallbackResult.data.items.filter(i => i.active !== false));
          }
        }
      } catch (err) {
        console.warn('Could not fetch dynamic ticker config, using static defaults:', err.message);
        try {
          const fallbackRes = await fetch(`${SITE_API_URL}/site/ticker`);
          const fallbackResult = await fallbackRes.json();
          if (fallbackResult.success && fallbackResult.data && fallbackResult.data.items) {
            setTickerItems(fallbackResult.data.items.filter(i => i.active !== false));
          }
        } catch (e) {}
      }
    };
    fetchTicker();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('bioxape_token');
    localStorage.removeItem('bioxape_user');
    setCurrentUser(null);
    toast.success('Logged out successfully.');
  };

  const handlePromptLogin = () => {
    // Direct link to the main site's login page
    toast('Redirecting you to Login page...', { icon: '🔑' });
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1000);
  };

  return (
    <Router basename={routerBasename}>
      <div className="app-container">
        <Toaster position="top-right" />

        {/* Ticker bar */}
        <div id="bx-ticker">
          <div className="bx-wrap" style={{ overflow: 'hidden' }}>
            <div id="bx-ticker-track">
              {tickerItems.map((item, idx) => (
                <React.Fragment key={idx}>
                  <b>{item.label}</b>
                  <span>{item.text}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Nav Bar */}
        <header id="bx-nav">
          <div className="bx-wrap nav-row">
            <a className="bx-brand" href="/">
              <div className="bx-brand-mark">
                <svg viewBox="0 0 24 24"><path d="m8 18.8 8.1-13.6"/><path d="M14 20h2"/><path d="m9 10 7.4-4"/><path d="m17 14.5-8-4.8"/><path d="M8 4h2"/><path d="m15.5 18-7.5-4.5"/><path d="m10 4 8 13.6"/></svg>
              </div>
              <div className="bx-brand-name">Bio<em><span className="brand-x">X</span>Ape</em></div>
            </a>

            <nav className="nav-links">
              <a href="/">Home</a>
              <div className="dropdown">
                <a href="#" className="dropdown-trigger">Explore ▾</a>
                <div className="dropdown-menu">
                  <a href="/category.html?name=Genomics%20%26%20Gene%20Editing">Genomics & Gene Editing</a>
                  <a href="/category.html?name=Biopharmaceuticals">Biopharmaceuticals</a>
                  <a href="/category.html?name=Synthetic%20Biology">Synthetic Biology</a>
                  <a href="/category.html?name=Bioinformatics">Bioinformatics</a>
                  <a href="/category.html?name=Immunology%20%26%20Vaccines">Immunology & Vaccines</a>
                  <a href="/category.html?name=Clinical%20Trials">Clinical Trials</a>
                  <a href="/category.html?name=Industry%20News">Industry News</a>
                  <a href="/category.html?name=Cancer%20Research">Cancer Research</a>
                </div>
              </div>
              <a 
                href="/tools" 
                style={window.location.pathname.startsWith('/tools') ? { color: 'var(--accent)', fontWeight: 600 } : {}}
                className={window.location.pathname.startsWith('/tools') ? 'nav-active' : ''}
              >
                Tools
              </a>
              <a href="/store.html">Store</a>
              <Link 
                to="/" 
                style={!window.location.pathname.startsWith('/tools') ? { color: 'var(--accent)', fontWeight: 600 } : {}}
                className={!window.location.pathname.startsWith('/tools') ? 'nav-active' : ''}
              >
                Forum
              </Link>
              <a href="/public-pages/write-for-us.html">Write for Us</a>
            </nav>

            <div className="nav-right">
              <div className="nav-search-bar">
                <svg className="nav-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  type="text" 
                  placeholder="Search topics..." 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      window.location.href = `/forum?search=${encodeURIComponent(e.target.value)}`;
                    }
                  }}
                />
              </div>
              {currentUser ? (
                <>
                  <a 
                    className="btn-dash" 
                    href={
                      currentUser.role === 'admin' ? '/admin.html' :
                      currentUser.role === 'editor' ? '/editor.html' :
                      currentUser.role === 'author' ? '/author.html' : '/login.html'
                    }
                  >
                    Dashboard ({currentUser.role})
                  </a>
                  <span className="btn-dash" onClick={handleLogout} style={{ cursor: 'pointer' }}>
                    Logout
                  </span>
                </>
              ) : (
                <>
                  <span className="btn-dash" onClick={handlePromptLogin} style={{ cursor: 'pointer' }}>
                    Dashboard
                  </span>
                  <a className="btn-sub" href="/public-pages/subscribe.html">
                    Subscribe ✦
                  </a>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main page content routing */}
        <main className="forum-main">
          <Routes>
            <Route 
              path="/" 
              element={
                <ForumPage 
                  currentUser={currentUser} 
                  onPromptLogin={handlePromptLogin} 
                />
              } 
            />
            <Route 
              path="/category/:slug" 
              element={
                <ForumCategoryPage 
                  currentUser={currentUser} 
                  onPromptLogin={handlePromptLogin} 
                />
              } 
            />
            <Route 
              path="/post/:postId" 
              element={
                <ForumPostPage 
                  currentUser={currentUser} 
                  onPromptLogin={handlePromptLogin} 
                />
              } 
            />
            <Route 
              path="/new" 
              element={<NewPostPage currentUser={currentUser} />} 
            />
            <Route 
              path="/tools" 
              element={<ToolsHub />} 
            />
            <Route 
              path="/tools/:slug" 
              element={<ToolPageWrapper />} 
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer style={{ background: 'var(--text1)', color: 'rgba(255,255,255,0.7)', padding: '40px 0', fontSize: '14px', borderTop: '4px solid var(--accent)' }}>
          <div className="bx-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600, color: '#fff', marginBottom: '8px' }}>BioXApe Biotechnology Forum</p>
              <p>© 2026 BioXApe. All rights reserved.</p>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="/public-pages/privacy-policy.html" style={{ color: 'rgba(255,255,255,0.7)' }}>Privacy Policy</a>
              <a href="/public-pages/contact.html" style={{ color: 'rgba(255,255,255,0.7)' }}>Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
