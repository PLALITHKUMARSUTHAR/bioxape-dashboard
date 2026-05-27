// ============================================================
//  BioXape — cms-sync.js
//  Fetches live site config from Render API and populates
//  every dynamic section of the public Blogger blog.
//  Embedded in bioxape-template.xml
// ============================================================

const CMS_API = 'https://bioxape-backend.onrender.com/api';

async function fetchSiteConfig() {
  try {
    const res  = await fetch(`${CMS_API}/site/all`);
    const data = await res.json();
    if (!data.success) return;
    const cfg = data.data;
    renderTicker(cfg.ticker);
    renderCategoryNav(cfg.category_nav);
    renderHero(cfg.hero_featured, cfg.hero_stack);
    renderNewsStrip(cfg.news_strip);
    renderTrending(cfg.trending);
    renderResearch(cfg.research_spotlight);
    renderInterviews(cfg.interviews);
    renderPlans(cfg.subscription_plans);
    renderCourses(cfg.courses);
    renderStore(cfg.store);
    renderAuthors(cfg.authors_display);
    renderFooter(cfg.footer);
    renderAdSense(cfg.adsense_slots);
  } catch (e) {
    console.warn('BioXape CMS sync failed — using static fallback', e.message);
  }
}

// ── Ticker ───────────────────────────────────────────────────
function renderTicker(data) {
  const el = document.getElementById('bx-ticker-track');
  if (!el || !data?.items) return;
  el.innerHTML = data.items
    .filter(i => i.active !== false)
    .map(i => `<b>${i.label}</b><span>${i.text}</span>`)
    .join('');
}

// ── Category Nav ─────────────────────────────────────────────
function renderCategoryNav(data) {
  const el = document.getElementById('bx-catbar-inner');
  if (!el || !data?.items) return;
  const sorted = [...data.items].sort((a,b) => a.order - b.order);
  el.innerHTML = sorted
    .filter(i => i.active !== false)
    .map((i,idx) => `<a class="cat-a ${idx===0?'active':''}"
      href="${i.bloggerLabel ? '/search/label/'+i.bloggerLabel : '/'}">${i.label}</a>`)
    .join('');
}

// ── Hero Magazine Grid ───────────────────────────────────────
function renderHero(hero, stack) {
  if (hero) {
    const titleEl   = document.getElementById('bx-hero-title');
    const excerptEl = document.getElementById('bx-hero-excerpt');
    const authorEl  = document.getElementById('bx-hero-author');
    const dateEl    = document.getElementById('bx-hero-date');
    const catEl     = document.getElementById('bx-hero-category');
    if (titleEl)   titleEl.textContent   = hero.title   || '';
    if (excerptEl) excerptEl.textContent = hero.excerpt  || '';
    if (authorEl)  authorEl.textContent  = hero.authorName || '';
    if (dateEl)    dateEl.textContent    = hero.date     || '';
    if (catEl)     catEl.textContent     = hero.category || '';
  }
  if (stack?.items) {
    stack.items.forEach((item, i) => {
      const card = document.getElementById(`bx-stack-${i}`);
      if (!card) return;
      const titleEl = card.querySelector('.stack-title');
      const metaEl  = card.querySelector('.stack-meta');
      const tagEl   = card.querySelector('.tag');
      const thumb   = card.querySelector('.stack-thumb');
      if (titleEl) titleEl.textContent = item.title   || '';
      if (metaEl)  metaEl.textContent  = item.meta    || '';
      if (tagEl)   tagEl.textContent   = item.tagText || '';
      if (thumb && item.emoji) thumb.textContent = item.emoji;
      if (thumb && item.themeClass) {
        thumb.className = `stack-thumb ${item.themeClass}`;
      }
    });
  }
}

// ── News Strip ───────────────────────────────────────────────
function renderNewsStrip(data) {
  const el = document.getElementById('bx-news-items');
  if (!el || !data?.items) return;
  el.innerHTML = data.items
    .filter(i => i.active !== false)
    .map(i => `
      <div class="news-item">
        <div class="news-dot"></div>
        <div class="news-text">${i.text}</div>
        <span class="tag tr" style="font-size:10px;padding:2px 7px;margin:0">${i.tagText||''}</span>
        <span class="news-time">${i.timeAgo||''}</span>
      </div>`).join('');
}

// ── Trending ─────────────────────────────────────────────────
function renderTrending(data) {
  const el = document.getElementById('bx-trending-list');
  if (!el || !data?.items) return;
  el.innerHTML = data.items.map((item, i) => `
    <div class="trend-item">
      <div class="trend-num">0${i+1}</div>
      <div>
        <div class="trend-title">${item.title||''}</div>
        <div class="trend-meta">${item.reads||''} reads &middot; ${item.timeAgo||''}</div>
      </div>
    </div>`).join('');
}

// ── Research Spotlight ───────────────────────────────────────
function renderResearch(data) {
  if (!data) return;
  const heroTitle = document.getElementById('bx-res-hero-title');
  const heroExc   = document.getElementById('bx-res-hero-excerpt');
  const heroJrnl  = document.getElementById('bx-res-hero-journal');
  const heroIF    = document.getElementById('bx-res-hero-if');
  if (heroTitle && data.hero) heroTitle.textContent   = data.hero.title   || '';
  if (heroExc   && data.hero) heroExc.textContent     = data.hero.excerpt  || '';
  if (heroJrnl  && data.hero) heroJrnl.textContent    = data.hero.journal  || '';
  if (heroIF    && data.hero) heroIF.textContent       = data.hero.ifScore  || '';
  if (data.hero?.stats) {
    data.hero.stats.forEach((s, i) => {
      const valEl = document.getElementById(`bx-res-stat-val-${i}`);
      const labEl = document.getElementById(`bx-res-stat-lab-${i}`);
      if (valEl) valEl.textContent = s.value || '';
      if (labEl) labEl.textContent = s.label || '';
    });
  }
  if (data.cards) {
    data.cards.forEach((c, i) => {
      const titleEl = document.getElementById(`bx-res-card-title-${i}`);
      const excEl   = document.getElementById(`bx-res-card-excerpt-${i}`);
      const jEl     = document.getElementById(`bx-res-card-journal-${i}`);
      if (titleEl) titleEl.textContent = c.title   || '';
      if (excEl)   excEl.textContent   = c.excerpt  || '';
      if (jEl)     jEl.textContent     = c.journal  || '';
    });
  }
}

// ── Interviews ───────────────────────────────────────────────
function renderInterviews(data) {
  if (!data?.items) return;
  data.items.forEach((item, i) => {
    const el = document.getElementById(`bx-interview-${i}`);
    if (!el) return;
    const titleEl   = el.querySelector('.int-title');
    const excerptEl = el.querySelector('.int-exc');
    const eyebrowEl = el.querySelector('.int-eyebrow');
    const metaEl    = el.querySelector('.int-meta');
    const photoEl   = el.querySelector('.int-photo');
    if (titleEl)   titleEl.textContent   = item.title   || '';
    if (excerptEl) excerptEl.textContent = item.excerpt  || '';
    if (eyebrowEl) eyebrowEl.textContent = item.eyebrow  || '';
    if (metaEl)    metaEl.textContent    = item.meta     || '';
    if (photoEl && item.emoji) photoEl.textContent = item.emoji;
  });
}

// ── Subscription Plans ───────────────────────────────────────
function renderPlans(data) {
  const el = document.getElementById('bx-plans-grid');
  if (!el || !data?.plans) return;
  el.innerHTML = data.plans.map(plan => `
    <div class="plan ${plan.isFeatured ? 'star' : ''}">
      ${plan.isFeatured ? '<div class="plan-crown">✦ Most Popular</div>' : ''}
      <div class="plan-icon pi-${plan.id==='free'?'f':plan.id==='pro'?'p':'i'}">${plan.icon||'🌱'}</div>
      <div class="plan-name">${plan.name}</div>
      <div class="plan-price"><sup>₹</sup>${plan.price||0}<sub>/month</sub></div>
      <div class="plan-desc">${plan.desc||''}</div>
      <ul class="plan-feats">
        ${(plan.features||[]).map(f=>`<li class="pf ${f.included?'':'no'}">${f.text}</li>`).join('')}
      </ul>
      <button class="btn-plan" onclick="startSubscription('${plan.id}','${plan.razorpayPlanId||''}',${plan.price||0})">${plan.buttonText||'Get Started'}</button>
    </div>`).join('');
}

// ── Courses ──────────────────────────────────────────────────
function renderCourses(data) {
  const el = document.getElementById('bx-courses-grid');
  if (!el || !data?.items) return;
  const icons = ['ci1','ci2','ci3','ci4'];
  el.innerHTML = data.items.map((c, i) => `
    <div class="course-card">
      <div class="course-icon ${icons[i%4]}">${c.icon||'🔬'}</div>
      <div class="course-body">
        <div class="course-level">${c.level||''}</div>
        <div class="course-title">${c.title||''}</div>
        <div class="course-meta">${c.meta||''}</div>
        <div class="course-foot">
          <div class="course-price">${c.oldPrice?`<span class="price-old">₹${c.oldPrice}</span>`:''}₹${c.price||''}</div>
          <button class="btn-enroll" onclick="window.open('${c.enrollUrl||'#'}','_blank')">Enroll Now</button>
        </div>
      </div>
    </div>`).join('');
}

// ── Store ────────────────────────────────────────────────────
function renderStore(data) {
  const el = document.getElementById('bx-store-grid');
  if (!el || !data?.items) return;
  const themes = ['si1','si2','si3','si4'];
  el.innerHTML = data.items.map((p, i) => `
    <div class="store-card">
      <div class="store-img ${themes[i%4]}">${p.emoji||'📦'}</div>
      <div class="store-body">
        <div class="store-name">${p.name||''}</div>
        <div class="store-type">${p.type||''}</div>
        <div class="store-price">${p.oldPrice?`<span class="price-old">₹${p.oldPrice}</span>`:''}₹${p.price||''}</div>
        <button class="btn-cart" onclick="window.open('${p.cartUrl||'#'}','_blank')">Add to Cart</button>
      </div>
    </div>`).join('');
}

// ── Authors ──────────────────────────────────────────────────
function renderAuthors(data) {
  const el = document.getElementById('bx-authors-grid');
  if (!el) return;
  fetch(`${CMS_API}/users/authors-public`)
    .then(r => r.json())
    .then(res => {
      if (!res.success || !res.data.length) return;
      const avColors = ['#27a363','#2563eb','#d97706','#7c3aed','#dc2626','#0d9488'];
      el.innerHTML = res.data.map((a, i) => `
        <div class="author-card">
          ${a.photoUrl
            ? `<img src="${a.photoUrl}" alt="${a.name}" class="author-av" style="object-fit:cover"/>`
            : `<div class="author-av" style="background:${avColors[i%avColors.length]}">${(a.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>`}
          <div class="author-name">${a.name||''}</div>
          <div class="author-role">${a.role||'Author'}</div>
          <div class="author-org">${a.bio?.slice(0,60)||''}</div>
          <div class="author-tags">${(a.expertise||[]).slice(0,2).map(e=>`<span class="tag tg">${e}</span>`).join('')}</div>
          <div class="author-stats">
            <div><div class="as-val">${a.postsPublished||0}</div><div class="as-lab">Articles</div></div>
            <div><div class="as-val">${a.totalReads>=1000?(a.totalReads/1000).toFixed(1)+'K':a.totalReads||0}</div><div class="as-lab">Reads</div></div>
          </div>
          <div class="author-social">
            ${a.socialLinks?.twitter    ? `<a class="soc-btn" href="${a.socialLinks.twitter}"    target="_blank">𝕏</a>`:''}
            ${a.socialLinks?.linkedin   ? `<a class="soc-btn" href="${a.socialLinks.linkedin}"   target="_blank">in</a>`:''}
            ${a.socialLinks?.researchgate? `<a class="soc-btn" href="${a.socialLinks.researchgate}" target="_blank">Rg</a>`:''}
          </div>
        </div>`).join('');
    }).catch(() => {});
}

// ── Footer ───────────────────────────────────────────────────
function renderFooter(data) {
  if (!data) return;
  const s = data.socialLinks || {};
  const twitterEl  = document.getElementById('footer-social-twitter');
  const linkedinEl = document.getElementById('footer-social-linkedin');
  const youtubeEl  = document.getElementById('footer-social-youtube');
  const instaEl    = document.getElementById('footer-social-instagram');
  const copyEl     = document.getElementById('footer-copyright');
  if (twitterEl  && s.twitter)     twitterEl.href     = s.twitter;
  if (linkedinEl && s.linkedin)    linkedinEl.href    = s.linkedin;
  if (youtubeEl  && s.youtube)     youtubeEl.href     = s.youtube;
  if (instaEl    && s.instagram)   instaEl.href       = s.instagram;
  if (copyEl     && data.copyrightText) copyEl.textContent = data.copyrightText;
}

// ── AdSense Slots ────────────────────────────────────────────
function renderAdSense(data) {
  if (!data) return;
  Object.entries(data).forEach(([key, slot]) => {
    if (!slot.active || !slot.code) return;
    const el = document.getElementById(`adsense-${key}`);
    if (el) el.innerHTML = slot.code;
  });
}

// ── Razorpay Subscription from Blog ──────────────────────────
function startSubscription(planId, razorpayPlanId, amount) {
  if (!razorpayPlanId || amount === 0) {
    window.location.href = '/p/subscribe.html';
    return;
  }
  window.location.href = `/p/subscribe.html?plan=${planId}`;
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', fetchSiteConfig);
