import React from 'react';

export default function VoteButton({ score, userVote, onVote }) {
  return (
    <div className="post-vote-sidebar">
      <button 
        className={`btn-vote ${userVote === 'up' ? 'voted' : ''}`} 
        onClick={() => onVote('up')}
        title="Upvote"
      >
        ▲
      </button>
      <span className="vote-count">{score}</span>
      <button 
        className={`btn-vote ${userVote === 'down' ? 'voted' : ''}`} 
        onClick={() => onVote('down')}
        title="Downvote"
      >
        ▼
      </button>
    </div>
  );
}
