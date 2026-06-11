import React, { useState } from 'react';

export default function CommentBox({ onSubmit, isLoggedIn, onPromptLogin, placeholder = "Share your thoughts..." }) {
  const [body, setBody] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    onSubmit(body.trim());
    setBody('');
  };

  if (!isLoggedIn) {
    return (
      <div className="prompt-banner">
        <p>You must be signed in to post a comment.</p>
        <button className="btn-cta" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={onPromptLogin}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
      <div className="form-group">
        <textarea
          className="form-control"
          rows="4"
          placeholder={placeholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        ></textarea>
      </div>
      <button type="submit" className="btn-submit-post" disabled={!body.trim()}>
        Post Comment
      </button>
    </form>
  );
}
