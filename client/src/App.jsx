import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';

// Import Pages
import ForumPage from './pages/ForumPage';
import ForumCategoryPage from './pages/ForumCategoryPage';
import ForumPostPage from './pages/ForumPostPage';
import NewPostPage from './pages/NewPostPage';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

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
    <Router basename="/forum">
      <div className="app-container">
        <Toaster position="top-right" />

        {/* Ticker bar */}
        <div id="bx-ticker">
          <div className="bx-wrap">
            <span>🧬 <b>Science:</b> DNA synthesis breakthrough at BioXApe lab 🔬</span>
            <span style={{ marginLeft: '40px' }}>📄 <b>Publications:</b> CRISPR-Cas12 structural dynamics report published</span>
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
              <a href="/research.html">Tools</a>
              <a href="/store.html">Store</a>
              <Link to="/" style={{ color: 'var(--accent)', fontWeight: 600 }}>Forum</Link>
              <a href="/public-pages/write-for-us.html">Write for Us</a>
            </nav>

            <div className="nav-right">
              <div className="nav-search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '6px 12px', marginRight: '10px' }}>
                <svg className="nav-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', color: 'var(--text3)', marginRight: '6px' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  type="text" 
                  placeholder="Search topics..." 
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: 'var(--text1)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      window.location.href = `/forum?search=${encodeURIComponent(e.target.value)}`;
                    }
                  }}
                />
              </div>
              {currentUser ? (
                <>
                  <a className="btn-dash" href="/dashboard.html">
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
