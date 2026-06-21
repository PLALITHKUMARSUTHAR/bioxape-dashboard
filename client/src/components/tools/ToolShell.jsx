import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toolsRegistry } from '../../data/toolsRegistry';

export function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`bx-tool-btn ${copied ? 'copied' : ''} ${className}`}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          Copied
        </>
      ) : (
        <>
          <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy
        </>
      )}
    </button>
  );
}

export function ExportButton({ data, filename, format = 'txt', className = '' }) {
  const handleExport = () => {
    let content = data;
    let mimeType = 'text/plain';

    if (format === 'csv') {
      mimeType = 'text/csv';
    } else if (format === 'fasta') {
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `export.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`bx-tool-btn ${className}`}
      aria-label={`Export as ${format.toUpperCase()}`}
    >
      <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Export {format.toUpperCase()}
    </button>
  );
}

export default function ToolShell({ slug, children }) {
  const [isOpen, setIsOpen] = useState(false);

  // Find metadata from registry
  const tool = toolsRegistry.find((t) => t.slug === slug);

  if (!tool) {
    return (
      <div className="bx-wrap tool-shell-error">
        <p>Tool registry lookup failed for slug: "{slug}"</p>
        <Link to="/tools" className="bx-back-link">← Return to Tools</Link>
      </div>
    );
  }

  return (
    <div className="bx-wrap tool-shell-container">
      {/* Dynamic Style Injection for Tool Shell Components */}
      <style>{`
        .tool-shell-container {
          padding: 24px 0 48px 0;
          font-family: var(--font-sans);
          color: var(--text1);
        }
        .tool-shell-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .tool-shell-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .bx-back-link {
          font-size: 14px;
          font-weight: 500;
          color: var(--text3);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color 0.15s ease;
        }
        .bx-back-link:hover {
          color: var(--accent);
          text-decoration: none;
        }
        .bx-back-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .tool-title-row {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tool-title-name {
          font-size: 24px;
          font-weight: 700;
          color: var(--text1);
        }
        .tool-title-hook {
          font-size: 16px;
          color: var(--text3);
          font-weight: 400;
        }
        .tool-category-badge {
          background-color: var(--accent-l);
          color: var(--accent-d);
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid var(--border2);
        }
        .tool-disclosure-btn {
          background: none;
          border: none;
          color: var(--text3);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 0;
          transition: color 0.15s ease;
        }
        .tool-disclosure-btn:hover {
          color: var(--accent);
        }
        .tool-disclosure-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .tool-disclosure-chevron {
          width: 14px;
          height: 14px;
          transition: transform 0.2s ease;
          stroke: currentColor;
          fill: none;
        }
        .tool-disclosure-chevron.open {
          transform: rotate(180deg);
        }
        .tool-disclosure-panel {
          overflow: hidden;
          transition: max-height 0.2s ease, opacity 0.2s ease, margin-top 0.2s ease;
          max-height: 0px;
          opacity: 0;
        }
        .tool-disclosure-panel.open {
          max-height: 150px;
          opacity: 1;
          margin-top: 10px;
          padding: 12px;
          background: var(--off);
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .tool-description-text {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text2);
        }
        .tool-layout-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-top: 24px;
        }
        @media (min-width: 1024px) {
          .tool-layout-grid {
            grid-template-columns: 1.2fr 1.8fr;
          }
        }
        .tool-pane-card {
          background-color: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .tool-pane-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text1);
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tool-scope-disclaimer {
          margin-top: 16px;
          padding: 10px 14px;
          background-color: var(--off);
          border-left: 3px solid var(--border2);
          border-radius: 0 6px 6px 0;
          font-size: 13px;
          font-style: italic;
          color: var(--text3);
        }
        .bx-tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--white);
          color: var(--text2);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .bx-tool-btn:hover {
          background-color: var(--g50);
          border-color: var(--border2);
          color: var(--accent);
        }
        .bx-tool-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .bx-tool-btn.copied {
          background-color: var(--g100);
          border-color: var(--accent);
          color: var(--accent-d);
        }
        .btn-icon {
          width: 14px;
          height: 14px;
        }
      `}</style>

      {/* Breadcrumb & Header row */}
      <div className="tool-shell-header">
        <div>
          <Link to="/tools" className="bx-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Tools
          </Link>
        </div>
        <div className="tool-shell-meta-row">
          <div className="tool-title-row">
            <span className="tool-title-name">{tool.name}</span>
            <span className="tool-title-hook">— {tool.hook}</span>
          </div>
          <span className="tool-category-badge">{tool.category}</span>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="tool-disclosure-btn"
            aria-expanded={isOpen}
          >
            What does this do?
            <svg className={`tool-disclosure-chevron ${isOpen ? 'open' : ''}`} viewBox="0 0 24 24" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div className={`tool-disclosure-panel ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
            <p className="tool-description-text">{tool.description}</p>
          </div>
        </div>
      </div>

      {/* Main Tool Content Container */}
      <div className="tool-workspace">
        {/* Pass scopeNote if present to help with disclaimers inside the workspace */}
        {children}

        {/* Persistent Scope Note Disclaimer */}
        {tool.scopeNote && (
          <div className="tool-scope-disclaimer" id={`scope-${tool.slug}`}>
            <span>{tool.scopeNote}</span>
          </div>
        )}
      </div>
    </div>
  );
}
