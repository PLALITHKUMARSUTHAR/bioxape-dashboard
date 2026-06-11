import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import CommentBox from './CommentBox';

export default function CommentThread({ 
  comments, 
  currentUser, 
  postAuthorId,
  isPostLocked,
  onVoteComment, 
  onReplySubmit, 
  onDeleteComment, 
  onAcceptAnswer,
  onPromptLogin
}) {
  const [replyingTo, setReplyingTo] = useState(null);

  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';

  const formatCommentDate = (dateStr) => {
    return dateStr ? formatDistanceToNow(new Date(dateStr), { addSuffix: true }) : '';
  };

  const CommentNode = ({ comment, isNested = false }) => {
    const {
      _id,
      body,
      author,
      createdAt,
      upvotes = [],
      isAcceptedAnswer
    } = comment;

    const authorName = author?.name || 'Anonymous';
    const authorInitial = authorName.charAt(0).toUpperCase();
    const upvotesCount = upvotes.length;
    const isUpvoted = currentUser ? upvotes.includes(currentUser._id) : false;

    // Permissions check
    const canDelete = currentUser && (author?._id === currentUser._id || isAdmin);
    const canAccept = currentUser && (postAuthorId === currentUser._id || isAdmin);

    return (
      <div className={`comment-card ${isNested ? 'nested' : ''}`}>
        <div className="comment-header">
          <div className="user-avatar">{authorInitial}</div>
          <span className="comment-author">{authorName}</span>
          {author?.role === 'admin' && (
            <span style={{ fontSize: '10px', background: 'var(--amber-l)', color: 'var(--amber)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
              ADMIN
            </span>
          )}
          <span>{formatCommentDate(createdAt)}</span>
          {isAcceptedAnswer && (
            <span className="accepted-badge">
              ✓ Accepted Answer
            </span>
          )}
        </div>

        <div className="comment-body">
          {body}
        </div>

        <div className="comment-actions">
          <span className="action-link" onClick={() => onVoteComment(_id)}>
            ▲ {upvotesCount} {isUpvoted ? '(Upvoted)' : 'Upvote'}
          </span>
          
          {/* Reply button only for level 1 comments, and if thread is not locked */}
          {!isNested && !isPostLocked && (
            <span className="action-link" onClick={() => setReplyingTo(replyingTo === _id ? null : _id)}>
              Reply
            </span>
          )}

          {canDelete && (
            <span className="action-link" style={{ color: 'var(--red)' }} onClick={() => onDeleteComment(_id)}>
              Delete
            </span>
          )}

          {canAccept && (
            <span className="action-link" style={{ color: 'var(--accent)' }} onClick={() => onAcceptAnswer(_id)}>
              {isAcceptedAnswer ? 'Unaccept' : 'Accept Answer'}
            </span>
          )}
        </div>

        {replyingTo === _id && (
          <div style={{ marginTop: '14px', borderLeft: '2px solid var(--border)', paddingLeft: '14px' }}>
            <CommentBox 
              placeholder="Write a reply..."
              isLoggedIn={isLoggedIn}
              onPromptLogin={onPromptLogin}
              onSubmit={(replyBody) => {
                onReplySubmit(_id, replyBody);
                setReplyingTo(null);
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="comments-list">
      {comments.length === 0 ? (
        <p style={{ color: 'var(--text4)', textAlign: 'center', margin: '20px 0' }}>No comments yet. Be the first to share your thoughts!</p>
      ) : (
        comments.map((comment) => (
          <div key={comment._id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <CommentNode comment={comment} />
            {comment.replies && comment.replies.map((reply) => (
              <CommentNode key={reply._id} comment={reply} isNested={true} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
