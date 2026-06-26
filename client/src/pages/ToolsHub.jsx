import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toolsRegistry } from '../data/toolsRegistry';
import AdSlot from '../components/AdSlot';

// Category mapping helper
const CATEGORIES = [
  "Molecular Biology & PCR",
  "Synthetic Biology",
  "Proteomics & Structural Biology",
  "Lab Chemistry",
  "Bioinformatics Utilities"
];

const categorySlugMap = {
  'all': 'All',
  'molecular-biology-pcr': 'Molecular Biology & PCR',
  'synthetic-biology': 'Synthetic Biology',
  'proteomics-structural-biology': 'Proteomics & Structural Biology',
  'lab-chemistry': 'Lab Chemistry',
  'bioinformatics-utilities': 'Bioinformatics Utilities'
};

const getCategorySlug = (cat) => {
  return cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
};

// Simple Minimalist SVG Icon Components mapping
function ToolIcon({ name, className = '' }) {
  const iconProps = {
    className: `bx-tool-icon ${className}`,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { width: '22px', height: '22px' }
  };

  switch (name) {
    case 'dna':
      return (
        <svg {...iconProps}>
          <path d="M4.5 10.5C4.5 5 12 3 12 3s7.5 2 7.5 7.5-7.5 7.5-7.5 7.5S4.5 16 4.5 10.5z" />
          <path d="M12 3v15" strokeDasharray="3 3" />
          <path d="M4.5 10.5h15" />
        </svg>
      );
    case 'circle':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" strokeDasharray="2 2" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...iconProps}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'scissors':
      return (
        <svg {...iconProps}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      );
    case 'zap':
      return (
        <svg {...iconProps}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case 'droplet':
      return (
        <svg {...iconProps}>
          <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
        </svg>
      );
    case 'bar-chart':
      return (
        <svg {...iconProps}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...iconProps}>
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
        </svg>
      );
    case 'align':
      return (
        <svg {...iconProps}>
          <line x1="18" y1="10" x2="6" y2="10" />
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="14" x2="3" y2="14" />
          <line x1="18" y1="18" x2="6" y2="18" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...iconProps}>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
  }
}

// Reusable ToolCard component
function ToolCard({ tool }) {
  return (
    <Link
      to={`/tools/${tool.slug}`}
      className="bx-hub-card"
      aria-label={`Open ${tool.name}: ${tool.hook}`}
    >
      <div className="bx-hub-card-icon-wrapper">
        <ToolIcon name={tool.icon} />
      </div>
      <h3 className="bx-hub-card-title">{tool.name}</h3>
      <p className="bx-hub-card-hook">{tool.hook}</p>
      <span className="bx-hub-card-badge">{tool.category}</span>
    </Link>
  );
}

export default function ToolsHub() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse initial states from search params
  const categoryParam = searchParams.get('category') || 'all';
  const queryParam = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [debouncedQuery, setDebouncedQuery] = useState(queryParam);

  // Debouncing logic: 150ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Synchronize debounced search state and category pill with URL query parameters
  useEffect(() => {
    const params = {};
    if (categoryParam && categoryParam !== 'all') {
      params.category = categoryParam;
    }
    if (debouncedQuery) {
      params.q = debouncedQuery;
    }
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, categoryParam, setSearchParams]);

  // Handle setting category filter
  const handleCategoryChange = (slug) => {
    const params = {};
    if (slug !== 'all') {
      params.category = slug;
    }
    if (searchQuery) {
      params.q = searchQuery;
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSearchParams({});
  };

  // Filter tools based on query & category parameters
  const getFilteredTools = () => {
    return toolsRegistry.filter((tool) => {
      // 1. Category Filter
      const matchedCategoryName = categorySlugMap[categoryParam];
      if (categoryParam !== 'all' && tool.category !== matchedCategoryName) {
        return false;
      }

      // 2. Search Query Filter
      if (debouncedQuery) {
        const queryLower = debouncedQuery.toLowerCase();
        const matchesName = tool.name.toLowerCase().includes(queryLower);
        const matchesHook = tool.hook.toLowerCase().includes(queryLower);
        return matchesName || matchesHook;
      }

      return true;
    });
  };

  const filteredTools = getFilteredTools();

  // Check if category has any matching tools
  const categoryHasMatches = (categoryName) => {
    return filteredTools.some((tool) => tool.category === categoryName);
  };

  return (
    <div className="bx-wrap bx-hub-page-container">
      {/* Styles specific to ToolsHub */}
      <style>{`
        .bx-hub-page-container {
          padding: 20px 0 40px 0;
          font-family: var(--font-sans);
        }
        .bx-hub-header {
          margin-bottom: 24px;
        }
        .bx-hub-eyebrow {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--accent);
          margin-bottom: 6px;
        }
        .bx-hub-desc {
          font-size: 15px;
          color: var(--text3);
          line-height: 1.5;
          max-width: 720px;
        }
        .bx-hub-sticky-bar {
          position: sticky;
          top: 68px; /* Offset to stay below sticky nav */
          background-color: var(--off);
          z-index: 90;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 28px;
        }
        .bx-hub-search-wrapper {
          position: relative;
          width: 100%;
        }
        .bx-hub-search-input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px 16px 12px 42px;
          font-size: 14px;
          color: var(--text1);
          background-color: var(--white);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .bx-hub-search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(39, 163, 99, 0.15);
          outline: none;
        }
        .bx-hub-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text3);
          width: 18px;
          height: 18px;
          pointer-events: none;
        }
        .bx-hub-pills-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
          padding-bottom: 4px;
          margin-top: 4px;
        }
        .bx-hub-pills-row::-webkit-scrollbar {
          display: none; /* Safari / Chrome */
        }
        .bx-hub-pill {
          background-color: var(--white);
          border: 1px solid var(--border);
          color: var(--text3);
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 9999px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .bx-hub-pill:hover {
          border-color: var(--border2);
          color: var(--accent);
        }
        .bx-hub-pill.active {
          background-color: var(--accent);
          border-color: var(--accent);
          color: var(--white);
        }
        .bx-hub-pill:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .bx-category-section {
          margin-bottom: 32px;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .bx-category-divider {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text3);
          border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
          margin-bottom: 16px;
        }
        .bx-hub-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .bx-hub-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .bx-hub-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .bx-hub-card {
          background-color: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-decoration: none;
          color: inherit;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          position: relative;
        }
        .bx-hub-card:hover {
          transform: translateY(-2px);
          border-color: var(--g300);
          box-shadow: var(--shadow-hover);
        }
        .bx-hub-card:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-color: var(--accent);
        }
        .bx-hub-card-icon-wrapper {
          color: var(--accent);
          background-color: var(--accent-l);
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border2);
        }
        .bx-hub-card-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--text1);
        }
        .bx-hub-card-hook {
          font-size: 13px;
          color: var(--text3);
          line-height: 1.4;
          flex-grow: 1;
        }
        .bx-hub-card-badge {
          align-self: flex-start;
          background-color: var(--off);
          border: 1px solid var(--border);
          color: var(--text3);
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          margin-top: 6px;
        }
        .bx-hub-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          text-align: center;
          background-color: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .bx-hub-empty-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text1);
          margin-bottom: 6px;
        }
        .bx-hub-empty-desc {
          font-size: 14px;
          color: var(--text3);
          margin-bottom: 16px;
        }
        .bx-hub-btn-clear {
          background-color: var(--accent);
          color: var(--white);
          border: none;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .bx-hub-btn-clear:hover {
          background-color: var(--accent-d);
        }
        .bx-hub-btn-clear:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>

      {/* Header Band */}
      <header className="bx-hub-header">
        <div className="bx-hub-eyebrow">Tools</div>
        <p className="bx-hub-desc">
          Browser-based tools for sequence analysis, primer design, and lab calculations. No installs, no uploads, runs entirely in your browser.
        </p>
      </header>

      {/* Search and Filters Bar */}
      <section className="bx-hub-sticky-bar">
        {/* Search input */}
        <div className="bx-hub-search-wrapper">
          <svg className="bx-hub-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="bx-hub-search-input"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search BioXApe tools"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="bx-hub-pills-row" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={categoryParam === 'all'}
            className={`bx-hub-pill ${categoryParam === 'all' ? 'active' : ''}`}
            onClick={() => handleCategoryChange('all')}
          >
            All
          </button>
          {CATEGORIES.map((cat) => {
            const slug = getCategorySlug(cat);
            const active = categoryParam === slug;
            return (
              <button
                key={slug}
                type="button"
                role="tab"
                aria-selected={active}
                className={`bx-hub-pill ${active ? 'active' : ''}`}
                onClick={() => handleCategoryChange(slug)}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Grid grouped by Category */}
      <main className="bx-hub-content-container">
        {filteredTools.length > 0 ? (
          CATEGORIES.map((category) => {
            // Render category section only if it has matches under active query/filters
            if (!categoryHasMatches(category)) return null;

            // Render category section only if category filter matches or is 'all'
            const slug = getCategorySlug(category);
            if (categoryParam !== 'all' && categoryParam !== slug) return null;

            return (
              <section key={category} className="bx-category-section" aria-labelledby={`cat-${slug}`}>
                <div className="bx-category-divider" id={`cat-${slug}`}>
                  {category}
                </div>
                <div className="bx-hub-grid">
                  {filteredTools
                    .filter((tool) => tool.category === category)
                    .map((tool) => (
                      <ToolCard key={tool.slug} tool={tool} />
                    ))}
                </div>
              </section>
            );
          })
        ) : (
          /* Empty Search State */
          <div className="bx-hub-empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px', color: 'var(--text4)', marginBottom: '12px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <h4 className="bx-hub-empty-title">No tools match your criteria</h4>
            <p className="bx-hub-empty-desc">There are no tools corresponding to search "{debouncedQuery}" or category filter "{categorySlugMap[categoryParam]}".</p>
            <button
              type="button"
              className="bx-hub-btn-clear"
              onClick={handleClearFilters}
            >
              Clear Search & Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
