import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toolsRegistry } from '../../data/toolsRegistry';
import AdSlot from '../AdSlot';

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
        
        /* Unified Tools UI System & Step-wise Classes */
        .bx-step-section {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          margin-bottom: 20px;
        }
        .bx-step-section:hover {
          border-color: var(--border2);
          box-shadow: var(--shadow-hover);
        }
        .bx-step-header {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
          margin-bottom: 4px;
        }
        .bx-step-badge {
          background-color: var(--accent);
          color: var(--white);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
        }
        .bx-step-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text1);
          margin: 0;
        }
        .bx-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bx-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text2);
        }
        .bx-textarea {
          width: 100%;
          min-height: 100px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px;
          font-family: var(--font-mono, monospace);
          font-size: 13.5px;
          background-color: var(--off);
          resize: vertical;
          color: var(--text1);
          transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .bx-textarea:focus {
          border-color: var(--accent);
          background-color: var(--white);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
          outline: none;
        }
        .bx-input {
          width: 100%;
          height: 38px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0 12px;
          font-size: 13.5px;
          background-color: var(--off);
          color: var(--text1);
          transition: all 0.15s ease;
        }
        .bx-input:focus {
          border-color: var(--accent);
          background-color: var(--white);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
          outline: none;
        }
        .bx-select {
          height: 38px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0 8px;
          font-size: 13.5px;
          background-color: var(--off);
          color: var(--text1);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .bx-select:focus {
          border-color: var(--accent);
          background-color: var(--white);
          outline: none;
        }
        .bx-slider {
          width: 100%;
          height: 6px;
          background: var(--border);
          border-radius: 9999px;
          outline: none;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .bx-btn-primary {
          background-color: var(--accent);
          color: var(--white);
          border: none;
          border-radius: var(--radius-sm);
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }
        .bx-btn-primary:hover {
          background-color: var(--accent-d);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }
        .bx-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .bx-btn-sample {
          font-size: 12px;
          color: var(--accent);
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 600;
          padding: 2px 0;
          text-decoration: underline;
          transition: color 0.15s ease;
        }
        .bx-btn-sample:hover {
          color: var(--accent-d);
        }
        .bx-result-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 12px;
        }
        .bx-result-box {
          background-color: var(--off);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          transition: all 0.15s ease;
        }
        .bx-result-box:hover {
          border-color: var(--border2);
          background-color: var(--white);
        }
        .bx-result-val {
          font-size: 18px;
          font-weight: 700;
          color: var(--accent-d);
          font-family: var(--font-mono, monospace);
        }
        .bx-result-lbl {
          font-size: 11px;
          color: var(--text3);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }
        
        /* Step Tracker Styles */
        .bx-step-tracker {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
          flex-wrap: wrap;
        }
        .bx-step-item {
          flex: 1;
          min-width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text3);
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
          cursor: pointer;
          user-select: none;
        }
        .bx-step-item.active {
          color: var(--accent-d);
          border-bottom-color: var(--accent);
        }
        .bx-step-item.completed {
          color: var(--text2);
          border-bottom-color: var(--accent-d);
        }
        .bx-step-item.disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .bx-step-circle {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background-color: var(--border);
          color: var(--text3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
        }
        .bx-step-item.active .bx-step-circle {
          background-color: var(--accent);
          color: var(--white);
        }
        .bx-step-item.completed .bx-step-circle {
          background-color: var(--accent-d);
          color: var(--white);
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

        <AdSlot slotKey="TOOLS_RESULT" />
      </div>
    </div>
  );
}
