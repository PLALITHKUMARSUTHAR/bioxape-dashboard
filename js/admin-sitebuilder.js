// ============================================================
//  BioXape — admin-sitebuilder.js
//  Controls every editable section of the public blog
// ============================================================

async function loadSiteBuilder() {
  const el = document.getElementById('site-builder-sections');
  if (!el) return;
  el.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:20px;color:#7a9e8c"><div class="spinner"></div>Loading site builder...</div>`;
  const result = await apiCall('/site/all');
  if (!result?.success) { el.innerHTML = '<div class="alert alert-error">Failed to load site config</div>'; return; }
  const cfg = result.data;
  el.innerHTML = `
    ${tickerSection(cfg.ticker)}
    ${heroSection(cfg.hero_featured, cfg.hero_stack)}
    ${latestArticlesSection(cfg.latest_articles)}
    ${newsStripSection(cfg.news_strip)}
    ${trendingSection(cfg.trending)}
    ${researchSection(cfg.research_spotlight)}
    ${interviewsSection(cfg.interviews)}
    ${plansSection(cfg.subscription_plans)}
    ${coursesSection(cfg.courses)}
    ${storeSection(cfg.store)}
    ${footerSection(cfg.footer)}
  `;
  attachBuilderListeners();
}

// ── Section Renderers ────────────────────────────────────────

function tickerSection(data) {
  const items = data?.items || [];
  return builderSection('ticker', '📰 Breaking News Ticker', `
    <div id="ticker-items">
      ${items.map((item, i) => tickerItemRow(item, i)).join('')}
    </div>
    <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addTickerItem()">+ Add Item</button>
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveTicker()">Save Ticker</button></div>
  `);
}

function tickerItemRow(item, i) {
  return `<div class="draggable-item" id="ticker-item-${i}">
    <span class="drag-handle">⋮⋮</span>
    <select class="form-select" id="ticker-label-${i}" style="width:130px">
      ${['BREAKING','RESEARCH','INDUSTRY','FUNDING','EVENT','NEWS'].map(l=>`<option ${item.label===l?'selected':''}>${l}</option>`).join('')}
    </select>
    <input class="form-input" type="text" id="ticker-text-${i}" value="${item.text||''}" placeholder="News text..." style="flex:1"/>
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;white-space:nowrap">
      <input type="checkbox" id="ticker-active-${i}" ${item.active!==false?'checked':''} style="accent-color:var(--accent)"/> Active
    </label>
    <button class="btn btn-danger btn-sm btn-icon" onclick="removeTickerItem(${i})">✕</button>
  </div>`;
}

function heroSection(hero, stack) {
  return builderSection('hero', '🌟 Hero Section (Magazine Grid)', `
    <div style="margin-bottom:16px">
      <div style="font-weight:600;font-size:13.5px;margin-bottom:12px">Main Featured Article</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input class="form-input" id="hero-title" value="${hero?.title||''}" placeholder="Featured post title"/>
        </div>
        <div class="form-group">
          <label class="form-label">Author Name</label>
          <input class="form-input" id="hero-author" value="${hero?.authorName||''}" placeholder="Dr. Jane Smith"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Excerpt</label>
        <textarea class="form-textarea" id="hero-excerpt" rows="2">${hero?.excerpt||''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category Tag</label>
          <input class="form-input" id="hero-category" value="${hero?.category||''}" placeholder="Genomics"/>
        </div>
        <div class="form-group">
          <label class="form-label">Date Label</label>
          <input class="form-input" id="hero-date" value="${hero?.date||''}" placeholder="May 7, 2026"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cover Image URL</label>
        <input class="form-input" id="hero-cover" value="${hero?.coverImageUrl||''}" placeholder="https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=600&auto=format&fit=crop"/>
      </div>
    </div>
    <div style="font-weight:600;font-size:13.5px;margin-bottom:12px">Right Stack (4 cards)</div>
    ${(stack?.items || [{},{},{},{}]).map((item,i)=>`
      <div style="border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:600;color:#7a9e8c;margin-bottom:8px">Card ${i+1}</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="stack-title-${i}" value="${item.title||''}" placeholder="Post title..."/>
          </div>
          <div class="form-group">
            <label class="form-label">Tag &amp; Theme</label>
            <div style="display:flex;gap:6px">
              <input class="form-input" id="stack-tag-${i}" value="${item.tagText||''}" placeholder="Industry" style="flex:1"/>
              <select class="form-select" id="stack-theme-${i}" style="width:100px">
                ${['th-g','th-a','th-b','th-p','th-r','th-t'].map(t=>`<option ${item.themeClass===t?'selected':''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label class="form-label">Emoji / Icon Image URL</label>
            <input class="form-input" id="stack-emoji-${i}" value="${item.emoji||'🔬'}" style="width:100%" placeholder="Emoji or Image URL..."/>
          </div>
          <div class="form-group">
            <label class="form-label">Meta (date · read time)</label>
            <input class="form-input" id="stack-meta-${i}" value="${item.meta||''}" placeholder="May 6 · 5 min read"/>
          </div>
        </div>
      </div>`).join('')}
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveHero()">Save Hero Section</button></div>
  `);
}

function latestArticlesSection(data) {
  const items = data?.items || [];
  const mode = data?.mode || 'auto';
  
  return builderSection('latest-articles', '📰 Latest Articles Section', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Section Title</label>
        <input class="form-input" id="la-title" value="${data?.title||'Latest Articles'}" placeholder="Latest Articles"/>
      </div>
      <div class="form-group">
        <label class="form-label">Number of Articles to Show (Auto Mode)</label>
        <input class="form-input" type="number" id="la-limit" value="${data?.limit||6}"/>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Mode</label>
        <select class="form-select" id="la-mode" onchange="toggleLatestArticlesMode(this.value)" title="Choose feed source mode">
          <option value="auto" ${mode === 'auto' ? 'selected' : ''}>Auto — Pull latest from CMS</option>
          <option value="manual" ${mode === 'manual' ? 'selected' : ''}>Manual — I pick/create the posts</option>
        </select>
      </div>
      <div class="form-group" style="display:flex;align-items:center;padding-top:24px;">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
          <input type="checkbox" id="la-show-cover" ${data?.showCoverImage!==false?'checked':''} style="accent-color:var(--accent)"/> Show Cover Image
        </label>
      </div>
    </div>
    
    <div id="la-manual-container" style="display: ${mode === 'manual' ? 'block' : 'none'}; margin-top: 15px;">
      <div style="font-weight:600;font-size:13.5px;margin-bottom:12px">Manual Articles List</div>
      <div id="la-manual-items">
        ${items.map((item, idx) => manualArticleRow(item, idx)).join('')}
      </div>
      <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addManualArticle()">+ Add Article</button>
    </div>
    
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveLatestArticles()">Save Latest Articles</button></div>
  `);
}

async function saveLatestArticles() {
  const mode = document.getElementById('la-mode')?.value || 'auto';
  const items = [];
  
  if (mode === 'manual') {
    document.querySelectorAll('[id^="la-item-title-"]').forEach(el => {
      const idx = el.id.split('-').pop();
      items.push({
        title: el.value,
        authorName: document.getElementById(`la-item-author-${idx}`)?.value || '',
        excerpt: document.getElementById(`la-item-excerpt-${idx}`)?.value || '',
        category: document.getElementById(`la-item-category-${idx}`)?.value || '',
        readTimeMinutes: parseInt(document.getElementById(`la-item-readtime-${idx}`)?.value) || 5,
        publishedAt: document.getElementById(`la-item-date-${idx}`)?.value || '',
        coverImageUrl: document.getElementById(`la-item-cover-${idx}`)?.value || '',
        _id: document.getElementById(`la-item-link-${idx}`)?.value || ''
      });
    });
  }

  const data = {
    title: document.getElementById('la-title')?.value || 'Latest Articles',
    limit: parseInt(document.getElementById('la-limit')?.value) || 6,
    showCoverImage: document.getElementById('la-show-cover')?.checked ?? true,
    mode,
    items
  };
  
  const result = await apiCall('/site/config/latest_articles', 'PUT', { data });
  result?.success ? showToast('Latest articles config saved!', 'success') : showToast('Save failed', 'error');
}

function newsStripSection(data) {
  const items = data?.items || [{},{},{}];
  return builderSection('news-strip', '📡 Latest News Strip', `
    ${items.map((item,i)=>`
      <div style="border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:600;color:#7a9e8c;margin-bottom:8px">News Item ${i+1}</div>
        <div class="form-group"><label class="form-label">News Text</label>
          <input class="form-input" id="news-text-${i}" value="${item.text||''}" placeholder="News headline..."/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Tag Label</label>
            <input class="form-input" id="news-tag-${i}" value="${item.tagText||''}" placeholder="Regulatory"/></div>
          <div class="form-group"><label class="form-label">Time Label</label>
            <input class="form-input" id="news-time-${i}" value="${item.timeAgo||''}" placeholder="2h ago"/></div>
        </div>
      </div>`).join('')}
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveNewsStrip()">Save News Strip</button></div>
  `);
}

function trendingSection(data) {
  const items = data?.items || [{},{},{},{}];
  return builderSection('trending', '🔥 Trending Sidebar', `
    <div class="form-group">
      <label class="form-label">Mode</label>
      <select class="form-select" id="trending-mode" style="width:200px">
        <option value="manual" ${data?.mode==='manual'?'selected':''}>Manual — I pick the posts</option>
        <option value="auto"   ${data?.mode==='auto'?'selected':''}>Auto — Top by view count</option>
      </select>
    </div>
    ${items.map((item,i)=>`
      <div style="border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:600;color:#7a9e8c;margin-bottom:8px">Trending #${i+1}</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Title</label>
            <input class="form-input" id="trend-title-${i}" value="${item.title||''}" placeholder="Post title..."/></div>
          <div class="form-group"><label class="form-label">Reads & Time</label>
            <div style="display:flex;gap:6px">
              <input class="form-input" id="trend-reads-${i}" value="${item.reads||''}" placeholder="4.8K" style="flex:1"/>
              <input class="form-input" id="trend-time-${i}"  value="${item.timeAgo||''}" placeholder="5 days ago" style="flex:1"/>
            </div>
          </div>
        </div>
      </div>`).join('')}
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveTrending()">Save Trending</button></div>
  `);
}

function researchSection(data) {
  const hero  = data?.hero || {};
  const cards = data?.cards || [{},{}];
  return builderSection('research', '🔬 Research Spotlight', `
    <div style="font-weight:600;font-size:13.5px;margin-bottom:12px">Hero Research Card</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Journal &amp; Date</label>
        <input class="form-input" id="res-journal" value="${hero.journal||''}" placeholder="Nature Biotechnology · May 2026"/></div>
      <div class="form-group"><label class="form-label">Impact Factor</label>
        <input class="form-input" id="res-if" value="${hero.ifScore||''}" placeholder="54.9"/></div>
    </div>
    <div class="form-group"><label class="form-label">Title</label>
      <input class="form-input" id="res-title" value="${hero.title||''}" placeholder="Research paper title..."/></div>
    <div class="form-group"><label class="form-label">Excerpt</label>
      <textarea class="form-textarea" id="res-excerpt" rows="2">${hero.excerpt||''}</textarea></div>
    <div class="form-group"><label class="form-label">Full Paper URL</label>
      <input class="form-input" id="res-paper-url" value="${hero.paperUrl||''}" placeholder="https://nature.com/articles/..."/></div>
    <div class="form-group"><label class="form-label">4 Stat Cards (value|label)</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${(hero.stats||[{},{},{},{}]).map((s,i)=>`
          <div style="display:flex;gap:6px">
            <input class="form-input" id="res-stat-val-${i}" value="${s.value||''}" placeholder="8×" style="width:70px"/>
            <input class="form-input" id="res-stat-lab-${i}" value="${s.label||''}" placeholder="Therapeutic window"/>
          </div>`).join('')}
      </div>
    </div>
    <div style="font-weight:600;font-size:13.5px;margin:16px 0 10px">Side Cards (2)</div>
    ${cards.map((c,i)=>`
      <div style="border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px">
        <div class="form-group"><label class="form-label">Journal</label>
          <input class="form-input" id="res-card-journal-${i}" value="${c.journal||''}" placeholder="Science · April 2026"/></div>
        <div class="form-group"><label class="form-label">Title</label>
          <input class="form-input" id="res-card-title-${i}" value="${c.title||''}" placeholder="Paper title..."/></div>
        <div class="form-group"><label class="form-label">Excerpt</label>
          <textarea class="form-textarea" id="res-card-excerpt-${i}" rows="2">${c.excerpt||''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Impact Factor</label>
            <input class="form-input" id="res-card-if-${i}" value="${c.ifScore||''}" style="width:100px"/></div>
          <div class="form-group"><label class="form-label">Paper URL</label>
            <input class="form-input" id="res-card-url-${i}" value="${c.paperUrl||''}" placeholder="https://science.org/..."/></div>
        </div>
      </div>`).join('')}
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveResearch()">Save Research Spotlight</button></div>
  `);
}

function interviewsSection(data) {
  const items = data?.items || [{},{}];
  return builderSection('interviews', '🎙️ Expert Interviews', `
    ${items.map((item,i)=>`
      <div style="border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:600;color:#7a9e8c;margin-bottom:8px">Interview Card ${i+1}</div>
        <div class="form-row">
          <div class="form-group" style="flex:1"><label class="form-label">Emoji / Photo URL</label>
            <input class="form-input" id="int-emoji-${i}" value="${item.emoji||'👩‍🔬'}" style="width:100%" placeholder="Emoji or Image URL..."/></div>
          <div class="form-group"><label class="form-label">Eyebrow Label</label>
            <input class="form-input" id="int-eyebrow-${i}" value="${item.eyebrow||''}" placeholder="Featured Interview"/></div>
        </div>
        <div class="form-group"><label class="form-label">Title</label>
          <input class="form-input" id="int-title-${i}" value="${item.title||''}" placeholder="Interview headline..."/></div>
        <div class="form-group"><label class="form-label">Excerpt</label>
          <textarea class="form-textarea" id="int-excerpt-${i}" rows="2">${item.excerpt||''}</textarea></div>
        <div class="form-group"><label class="form-label">Meta (Name · Organisation · Read time · Date)</label>
          <input class="form-input" id="int-meta-${i}" value="${item.meta||''}" placeholder="Dr. Jane · MIT · 14 min · May 2026"/></div>
      </div>`).join('')}
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveInterviews()">Save Interviews</button></div>
  `);
}

function plansSection(data) {
  const plans = data?.plans || [];
  return builderSection('plans', '💳 Subscription Plans', `
    ${plans.map((plan,i)=>`
      <div style="border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:600;color:#7a9e8c;margin-bottom:8px">Plan: ${plan.name||i+1}</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Plan Name</label>
            <input class="form-input" id="plan-name-${i}" value="${plan.name||''}"/></div>
          <div class="form-group"><label class="form-label">Price (₹/month)</label>
            <input class="form-input" type="number" id="plan-price-${i}" value="${plan.price||0}"/></div>
        </div>
        <div class="form-group"><label class="form-label">Description</label>
          <input class="form-input" id="plan-desc-${i}" value="${plan.desc||''}"/></div>
        <div class="form-group"><label class="form-label">Razorpay Plan ID</label>
          <input class="form-input" id="plan-rzp-${i}" value="${plan.razorpayPlanId||''}" placeholder="plan_xxxxx"/></div>
        <div class="form-group"><label class="form-label">Features (one per line, prefix – for not-included)</label>
          <textarea class="form-textarea" id="plan-features-${i}" rows="5">${(plan.features||[]).map(f=>`${f.included?'':'– '}${f.text}`).join('\n')}</textarea></div>
      </div>`).join('')}
    <div class="modal-footer"><button class="btn btn-primary" onclick="savePlans()">Save Plans</button></div>
  `);
}

function coursesSection(data) {
  const items = data?.items || [];
  return builderSection('courses', '📚 Courses & Downloads', `
    <div id="courses-list">
      ${items.map((c,i)=>courseRow(c,i)).join('')}
    </div>
    <button class="btn btn-secondary btn-sm" onclick="addCourseRow()">+ Add Course</button>
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveCourses()">Save Courses</button></div>
  `);
}

function courseRow(c, i) {
  return `<div style="border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px" id="course-row-${i}">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Title</label>
        <input class="form-input" id="course-title-${i}" value="${c.title||''}" placeholder="Course title..."/></div>
      <div class="form-group"><label class="form-label">Level</label>
        <input class="form-input" id="course-level-${i}" value="${c.level||''}" placeholder="Beginner · Self-Paced"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Price (₹)</label>
        <input class="form-input" id="course-price-${i}" value="${c.price||''}"/></div>
      <div class="form-group"><label class="form-label">Old Price (₹)</label>
        <input class="form-input" id="course-oldprice-${i}" value="${c.oldPrice||''}"/></div>
    </div>
    <div class="form-group"><label class="form-label">Enroll Link / URL</label>
      <input class="form-input" id="course-url-${i}" value="${c.enrollUrl||''}" placeholder="https://..."/></div>
    <button class="btn btn-danger btn-sm btn-icon" onclick="removeCourseRow(${i})" style="margin-top:4px">✕ Remove</button>
  </div>`;
}

function storeSection(data) {
  const items = data?.items || [];
  return builderSection('store', '🛒 Store Products', `
    <div id="store-list">
      ${items.map((p,i)=>storeRow(p,i)).join('')}
    </div>
    <button class="btn btn-secondary btn-sm" onclick="addStoreRow()">+ Add Product</button>
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveStore()">Save Store</button></div>
  `);
}

function storeRow(p, i) {
  return `<div style="border:1px solid var(--border);border-radius:9px;padding:14px;margin-bottom:10px" id="store-row-${i}">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Product Name</label>
        <input class="form-input" id="store-name-${i}" value="${p.name||''}" placeholder="BioXApe Lab Notebook"/></div>
      <div class="form-group"><label class="form-label">Type / Description</label>
        <input class="form-input" id="store-type-${i}" value="${p.type||''}" placeholder="Hardcover · Branded Merch"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Price (₹)</label>
        <input class="form-input" id="store-price-${i}" value="${p.price||''}"/></div>
      <div class="form-group"><label class="form-label">Old Price (₹)</label>
        <input class="form-input" id="store-oldprice-${i}" value="${p.oldPrice||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1"><label class="form-label">Emoji / Product Image URL</label>
        <input class="form-input" id="store-emoji-${i}" value="${p.emoji||'📦'}" style="width:100%" placeholder="Emoji or Image URL..."/></div>
      <div class="form-group"><label class="form-label">Cart / Buy URL</label>
        <input class="form-input" id="store-url-${i}" value="${p.cartUrl||''}" placeholder="https://rzp.io/..."/></div>
    </div>
    <button class="btn btn-danger btn-sm btn-icon" onclick="removeStoreRow(${i})">✕ Remove</button>
  </div>`;
}

function footerSection(data) {
  const s = data?.socialLinks || {};
  return builderSection('footer', '🔗 Footer Links & Social', `
    <div style="font-weight:600;font-size:13.5px;margin-bottom:12px">Social Media Links</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Twitter / X</label>
        <input class="form-input" id="footer-twitter" value="${s.twitter||''}" placeholder="https://twitter.com/bioxape"/></div>
      <div class="form-group"><label class="form-label">LinkedIn</label>
        <input class="form-input" id="footer-linkedin" value="${s.linkedin||''}" placeholder="https://linkedin.com/company/bioxape"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">YouTube</label>
        <input class="form-input" id="footer-youtube" value="${s.youtube||''}" placeholder="https://youtube.com/@bioxape"/></div>
      <div class="form-group"><label class="form-label">Instagram</label>
        <input class="form-input" id="footer-instagram" value="${s.instagram||''}" placeholder="https://instagram.com/bioxape"/></div>
    </div>
    <div class="form-group"><label class="form-label">ResearchGate</label>
      <input class="form-input" id="footer-rg" value="${s.researchgate||''}" placeholder="https://researchgate.net/profile/bioxape"/></div>
    <div class="form-group"><label class="form-label">Copyright Text</label>
      <input class="form-input" id="footer-copyright" value="${data?.copyrightText||'2026 BioXApe. All rights reserved.'}" /></div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="saveFooter()">Save Footer</button></div>
  `);
}

// ── Builder wrapper ──────────────────────────────────────────
function builderSection(id, title, content) {
  return `<div class="builder-section" id="builder-${id}">
    <div class="builder-section-head" onclick="toggleBuilderSection('${id}')">
      <div class="builder-section-title">${title}</div>
      <span class="builder-toggle" id="toggle-${id}">▼</span>
    </div>
    <div class="builder-section-body" id="body-${id}">${content}</div>
  </div>`;
}

function toggleBuilderSection(id) {
  const body   = document.getElementById(`body-${id}`);
  const toggle = document.getElementById(`toggle-${id}`);
  body.classList.toggle('open');
  toggle.classList.toggle('open');
}

function attachBuilderListeners() {
  // All sections start closed — open first one
  const firstBody = document.querySelector('.builder-section-body');
  const firstToggle = document.querySelector('.builder-toggle');
  if (firstBody)   firstBody.classList.add('open');
  if (firstToggle) firstToggle.classList.add('open');
}

// ── Dynamic row helpers ──────────────────────────────────────
let tickerCount = 0;
function addTickerItem() {
  tickerCount++;
  const wrap = document.getElementById('ticker-items');
  const div  = document.createElement('div');
  div.innerHTML = tickerItemRow({ label:'BREAKING', text:'', active:true }, tickerCount + 10);
  wrap.appendChild(div.firstElementChild);
}
function removeTickerItem(i) { document.getElementById(`ticker-item-${i}`)?.remove(); }

let courseCount = 0;
function addCourseRow() {
  courseCount++;
  const wrap = document.getElementById('courses-list');
  const div  = document.createElement('div');
  div.innerHTML = courseRow({}, courseCount + 10);
  wrap.appendChild(div.firstElementChild);
}
function removeCourseRow(i) { document.getElementById(`course-row-${i}`)?.remove(); }

let storeCount = 0;
function addStoreRow() {
  storeCount++;
  const wrap = document.getElementById('store-list');
  const div  = document.createElement('div');
  div.innerHTML = storeRow({}, storeCount + 10);
  wrap.appendChild(div.firstElementChild);
}
function removeStoreRow(i) { document.getElementById(`store-row-${i}`)?.remove(); }

// ── Save Functions ───────────────────────────────────────────

async function saveTicker() {
  const items = [];
  document.querySelectorAll('[id^="ticker-label-"]').forEach(el => {
    const i = el.id.split('-').pop();
    items.push({ label: el.value, text: document.getElementById(`ticker-text-${i}`)?.value||'', active: document.getElementById(`ticker-active-${i}`)?.checked ?? true });
  });
  const result = await apiCall('/site/config/ticker','PUT',{ data: { items } });
  result?.success ? showToast('Ticker saved — blog updated!','success') : showToast('Save failed','error');
}

async function saveHero() {
  const heroData = {
    title:      document.getElementById('hero-title')?.value||'',
    excerpt:    document.getElementById('hero-excerpt')?.value||'',
    authorName: document.getElementById('hero-author')?.value||'',
    category:   document.getElementById('hero-category')?.value||'',
    date:       document.getElementById('hero-date')?.value||'',
    coverImageUrl: document.getElementById('hero-cover')?.value||''
  };
  const stackItems = [0,1,2,3].map(i => ({
    title:      document.getElementById(`stack-title-${i}`)?.value||'',
    tagText:    document.getElementById(`stack-tag-${i}`)?.value||'',
    themeClass: document.getElementById(`stack-theme-${i}`)?.value||'th-g',
    emoji:      document.getElementById(`stack-emoji-${i}`)?.value||'🔬',
    meta:       document.getElementById(`stack-meta-${i}`)?.value||''
  }));
  const [r1,r2] = await Promise.all([
    apiCall('/site/config/hero_featured','PUT',{ data: heroData }),
    apiCall('/site/config/hero_stack','PUT',{ data: { items: stackItems } })
  ]);
  r1?.success && r2?.success ? showToast('Hero section saved!','success') : showToast('Save failed','error');
}

async function saveNewsStrip() {
  const items = [0,1,2].map(i => ({
    text:    document.getElementById(`news-text-${i}`)?.value||'',
    tagText: document.getElementById(`news-tag-${i}`)?.value||'',
    timeAgo: document.getElementById(`news-time-${i}`)?.value||'',
    active:  true
  }));
  const result = await apiCall('/site/config/news_strip','PUT',{ data: { items } });
  result?.success ? showToast('News strip saved!','success') : showToast('Save failed','error');
}

async function saveTrending() {
  const mode  = document.getElementById('trending-mode')?.value||'manual';
  const items = [0,1,2,3].map(i => ({
    title:   document.getElementById(`trend-title-${i}`)?.value||'',
    reads:   document.getElementById(`trend-reads-${i}`)?.value||'',
    timeAgo: document.getElementById(`trend-time-${i}`)?.value||''
  }));
  const result = await apiCall('/site/config/trending','PUT',{ data: { mode, items } });
  result?.success ? showToast('Trending saved!','success') : showToast('Save failed','error');
}

async function saveResearch() {
  const stats = [0,1,2,3].map(i => ({
    value: document.getElementById(`res-stat-val-${i}`)?.value||'',
    label: document.getElementById(`res-stat-lab-${i}`)?.value||''
  }));
  const hero = {
    journal: document.getElementById('res-journal')?.value||'',
    title:   document.getElementById('res-title')?.value||'',
    excerpt: document.getElementById('res-excerpt')?.value||'',
    ifScore: document.getElementById('res-if')?.value||'',
    paperUrl: document.getElementById('res-paper-url')?.value||'',
    stats
  };
  const cards = [0,1].map(i => ({
    journal: document.getElementById(`res-card-journal-${i}`)?.value||'',
    title:   document.getElementById(`res-card-title-${i}`)?.value||'',
    excerpt: document.getElementById(`res-card-excerpt-${i}`)?.value||'',
    ifScore: document.getElementById(`res-card-if-${i}`)?.value||'',
    paperUrl: document.getElementById(`res-card-url-${i}`)?.value||''
  }));
  const result = await apiCall('/site/config/research_spotlight','PUT',{ data: { hero, cards } });
  result?.success ? showToast('Research spotlight saved!','success') : showToast('Save failed','error');
}

async function saveInterviews() {
  const items = [0,1].map(i => ({
    emoji:   document.getElementById(`int-emoji-${i}`)?.value||'👩‍🔬',
    eyebrow: document.getElementById(`int-eyebrow-${i}`)?.value||'',
    title:   document.getElementById(`int-title-${i}`)?.value||'',
    excerpt: document.getElementById(`int-excerpt-${i}`)?.value||'',
    meta:    document.getElementById(`int-meta-${i}`)?.value||''
  }));
  const result = await apiCall('/site/config/interviews','PUT',{ data: { items } });
  result?.success ? showToast('Interviews saved!','success') : showToast('Save failed','error');
}

async function savePlans() {
  const result = await apiCall('/site/config/subscription_plans','GET');
  const existing = result?.data?.data?.plans || [{},{},{}];
  const plans = existing.map((plan,i) => {
    const featuresRaw = document.getElementById(`plan-features-${i}`)?.value.split('\n').filter(l=>l.trim())||[];
    return {
      ...plan,
      name:          document.getElementById(`plan-name-${i}`)?.value||plan.name,
      price:         parseInt(document.getElementById(`plan-price-${i}`)?.value)||0,
      desc:          document.getElementById(`plan-desc-${i}`)?.value||'',
      razorpayPlanId:document.getElementById(`plan-rzp-${i}`)?.value||'',
      features:      featuresRaw.map(l => ({ text: l.replace(/^–\s*/,''), included: !l.startsWith('–') }))
    };
  });
  const saveResult = await apiCall('/site/config/subscription_plans','PUT',{ data: { plans } });
  saveResult?.success ? showToast('Plans saved!','success') : showToast('Save failed','error');
}

async function saveCourses() {
  const items = [];
  document.querySelectorAll('[id^="course-title-"]').forEach(el => {
    const i = el.id.split('-').pop();
    items.push({
      title:     el.value,
      level:     document.getElementById(`course-level-${i}`)?.value||'',
      price:     document.getElementById(`course-price-${i}`)?.value||'',
      oldPrice:  document.getElementById(`course-oldprice-${i}`)?.value||'',
      enrollUrl: document.getElementById(`course-url-${i}`)?.value||''
    });
  });
  const result = await apiCall('/site/config/courses','PUT',{ data: { items } });
  result?.success ? showToast('Courses saved!','success') : showToast('Save failed','error');
}

async function saveStore() {
  const items = [];
  document.querySelectorAll('[id^="store-name-"]').forEach(el => {
    const i = el.id.split('-').pop();
    items.push({
      name:     el.value,
      type:     document.getElementById(`store-type-${i}`)?.value||'',
      price:    document.getElementById(`store-price-${i}`)?.value||'',
      oldPrice: document.getElementById(`store-oldprice-${i}`)?.value||'',
      emoji:    document.getElementById(`store-emoji-${i}`)?.value||'📦',
      cartUrl:  document.getElementById(`store-url-${i}`)?.value||''
    });
  });
  const result = await apiCall('/site/config/store','PUT',{ data: { items } });
  result?.success ? showToast('Store saved!','success') : showToast('Save failed','error');
}

async function saveFooter() {
  const data = {
    socialLinks: {
      twitter:      document.getElementById('footer-twitter')?.value||'',
      linkedin:     document.getElementById('footer-linkedin')?.value||'',
      youtube:      document.getElementById('footer-youtube')?.value||'',
      instagram:    document.getElementById('footer-instagram')?.value||'',
      researchgate: document.getElementById('footer-rg')?.value||''
    },
    copyrightText: document.getElementById('footer-copyright')?.value||''
  };
  const result = await apiCall('/site/config/footer','PUT',{ data });
  result?.success ? showToast('Footer saved!','success') : showToast('Save failed','error');
}

// ── LATEST ARTICLES MANUAL CONFIG HELPERS ──────────────────────
function toggleLatestArticlesMode(mode) {
  const container = document.getElementById('la-manual-container');
  if (container) {
    container.style.display = mode === 'manual' ? 'block' : 'none';
  }
}

let manualArticleCount = 100;
function addManualArticle() {
  manualArticleCount++;
  const wrap = document.getElementById('la-manual-items');
  if (!wrap) return;
  const div = document.createElement('div');
  div.innerHTML = manualArticleRow({}, manualArticleCount);
  wrap.appendChild(div.firstElementChild);
  
  // Re-index titles/numbers dynamically
  reindexManualArticles();
}

function removeManualArticle(idx) {
  const el = document.getElementById(`la-item-${idx}`);
  if (el) {
    el.remove();
    reindexManualArticles();
  }
}

function reindexManualArticles() {
  document.querySelectorAll('[id^="la-item-"]').forEach((el, idx) => {
    const titleSpan = el.querySelector('span');
    if (titleSpan) {
      titleSpan.textContent = `Article #${idx + 1}`;
    }
  });
}

function manualArticleRow(item, i) {
  return `
    <div class="draggable-item-vertical" id="la-item-${i}" style="border:1px solid var(--border);border-radius:9px;padding:12px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px;background:var(--off)">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12.5px;font-weight:600;color:var(--text3)">Article #${i+1}</span>
        <button class="btn btn-danger btn-sm" style="padding: 2px 6px;" onclick="removeManualArticle(${i})">✕ Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" style="font-size:11px;">Title</label>
          <input class="form-input" type="text" id="la-item-title-${i}" value="${item.title||''}" placeholder="Article title..." style="font-size:12px;padding:5px 8px;"/>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:11px;">Author Name</label>
          <input class="form-input" type="text" id="la-item-author-${i}" value="${item.authorName||''}" placeholder="Dr. Deepa Rao" style="font-size:12px;padding:5px 8px;"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" style="font-size:11px;">Excerpt</label>
        <textarea class="form-textarea" id="la-item-excerpt-${i}" rows="1" placeholder="Brief summary..." style="font-size:12px;padding:5px 8px;">${item.excerpt||''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" style="font-size:11px;">Category</label>
          <input class="form-input" type="text" id="la-item-category-${i}" value="${item.category||''}" placeholder="Research" style="font-size:12px;padding:5px 8px;"/>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:11px;">Read Time (min)</label>
          <input class="form-input" type="number" id="la-item-readtime-${i}" value="${item.readTimeMinutes||item.readTime||5}" style="font-size:12px;padding:5px 8px;"/>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:11px;">Date (YYYY-MM-DD)</label>
          <input class="form-input" type="text" id="la-item-date-${i}" value="${item.publishedAt||item.date||''}" placeholder="2026-05-06" style="font-size:12px;padding:5px 8px;"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" style="font-size:11px;">Cover Image URL</label>
          <input class="form-input" type="text" id="la-item-cover-${i}" value="${item.coverImageUrl||''}" placeholder="https://..." style="font-size:12px;padding:5px 8px;"/>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:11px;">Post Link/ID (optional)</label>
          <input class="form-input" type="text" id="la-item-link-${i}" value="${item._id||item.postId||item.link||''}" placeholder="Post ID or URL..." style="font-size:12px;padding:5px 8px;"/>
        </div>
      </div>
    </div>
  `;
}
