import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  getPostById, 
  votePost, 
  getComments, 
  createComment, 
  voteComment, 
  acceptComment, 
  deleteComment, 
  deletePost,
  updatePost
} from '../api/forum';
import VoteButton from '../components/forum/VoteButton';
import CommentThread from '../components/forum/CommentThread';
import CommentBox from '../components/forum/CommentBox';
import TagBadge from '../components/forum/TagBadge';
import AdSlot from '../components/AdSlot';

export default function ForumPostPage({ currentUser, onPromptLogin }) {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const isLoggedIn = !!currentUser;

  const loadPostDetails = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        getPostById(postId),
        getComments(postId)
      ]);
      setPost(postRes.data?.data || null);
      setComments(commentsRes.data?.data || []);
    } catch (err) {
      console.error('Error loading post details:', err);
      setError('Post not found or network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPostDetails();
  }, [postId]);

  const handleVote = async (type) => {
    if (!isLoggedIn) {
      onPromptLogin();
      return;
    }
    try {
      const res = await votePost(postId, type);
      if (res.data?.success) {
        setPost(prev => ({
          ...prev,
          upvotes: res.data.upvotes,
          downvotes: res.data.downvotes
        }));
      }
    } catch (err) {
      console.error('Error voting post:', err);
    }
  };

  const handleNewComment = async (body, parentCommentId = null) => {
    try {
      const res = await createComment(postId, { body, parentComment: parentCommentId });
      if (res.data?.success) {
        loadPostDetails(); // reload to show the nested tree correctly
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  const handleVoteComment = async (commentId) => {
    if (!isLoggedIn) {
      onPromptLogin();
      return;
    }
    try {
      const res = await voteComment(commentId, 'up');
      if (res.data?.success) {
        loadPostDetails();
      }
    } catch (err) {
      console.error('Error voting comment:', err);
    }
  };

  const handleAcceptComment = async (commentId) => {
    try {
      const res = await acceptComment(commentId);
      if (res.data?.success) {
        loadPostDetails();
      }
    } catch (err) {
      console.error('Error accepting comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await deleteComment(commentId);
      if (res.data?.success) {
        loadPostDetails();
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this entire discussion?')) return;
    try {
      const res = await deletePost(postId);
      if (res.data?.success) {
        navigate('/');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleTogglePin = async () => {
    try {
      const res = await updatePost(postId, { isPinned: !post.isPinned });
      if (res.data?.success) {
        setPost(prev => ({ ...prev, isPinned: res.data.data.isPinned }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLock = async () => {
    try {
      const res = await updatePost(postId, { isLocked: !post.isLocked });
      if (res.data?.success) {
        setPost(prev => ({ ...prev, isLocked: res.data.data.isLocked }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text3)' }}>
        <p>Loading discussion details...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="bx-wrap" style={{ padding: '40px 0', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--red)' }}>{error || 'Discussion not found.'}</h2>
        <Link to="/" style={{ marginTop: '20px', display: 'inline-block' }}>Back to Forum</Link>
      </div>
    );
  }

  const score = (post.upvotes?.length || 0) - (post.downvotes?.length || 0);
  
  let userVote = null;
  if (currentUser) {
    if (post.upvotes?.includes(currentUser._id)) userVote = 'up';
    else if (post.downvotes?.includes(currentUser._id)) userVote = 'down';
  }

  const isAuthor = currentUser && post.author?._id === currentUser._id;
  const canDeletePost = isAuthor || isAdmin;

  return (
    <div className="bx-wrap">
      {/* Post Detail Card */}
      <div className="post-detail">
        <VoteButton score={score} userVote={userVote} onVote={handleVote} />

        <div className="post-main-content">
          <div className="post-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
                {post.category?.icon} {post.category?.name}
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                {isAdmin && (
                  <>
                    <button 
                      onClick={handleTogglePin} 
                      className="btn-page" 
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {post.isPinned ? 'Unpin 📌' : 'Pin 📌'}
                    </button>
                    <button 
                      onClick={handleToggleLock} 
                      className="btn-page" 
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      {post.isLocked ? 'Unlock 🔓' : 'Lock 🔒'}
                    </button>
                  </>
                )}
                {canDeletePost && (
                  <button 
                    onClick={handleDeletePost} 
                    className="btn-page" 
                    style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--red)', borderColor: 'var(--red)' }}
                  >
                    Delete Post
                  </button>
                )}
              </div>
            </div>

            <h1 className="post-title">{post.title}</h1>

            <div className="post-card-meta" style={{ border: 'none', padding: 0 }}>
              <div className="post-card-author">
                <div className="user-avatar">{(post.author?.name || 'Anonymous').charAt(0).toUpperCase()}</div>
                <span>{post.author?.name || 'Anonymous'}</span>
                {post.author?.role && ['admin', 'editor', 'author'].includes(post.author.role) && (
                  <span style={{ 
                    fontSize: '10px', 
                    background: post.author.role === 'admin' ? 'var(--red-l)' : post.author.role === 'editor' ? 'var(--blue-l)' : 'var(--accent-l)', 
                    color: post.author.role === 'admin' ? 'var(--red)' : post.author.role === 'editor' ? 'var(--blue)' : 'var(--accent)', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginLeft: '6px',
                    display: 'inline-block',
                    lineHeight: '1.2'
                  }}>
                    {post.author.role}
                  </span>
                )}
              </div>
              <span>•</span>
              <span>Asked {new Date(post.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>👁 {post.views} views</span>
            </div>
          </div>

          <div className="post-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.body}
            </ReactMarkdown>
          </div>

          <div className="tags-cloud">
            {post.tags?.map((t, idx) => (
              <TagBadge key={idx} tag={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div className="comments-section">
        <h2 className="comments-header">
          {post.commentCount || 0} {post.commentCount === 1 ? 'Response' : 'Responses'}
        </h2>

        {post.isLocked && (
          <div className="closed-banner">
            🔒 This thread is locked. You cannot reply or post comments to it.
          </div>
        )}

        <CommentThread 
          comments={comments}
          currentUser={currentUser}
          postAuthorId={post.author?._id}
          isPostLocked={post.isLocked}
          onVoteComment={handleVoteComment}
          onReplySubmit={(commentId, body) => handleNewComment(body, commentId)}
          onDeleteComment={handleDeleteComment}
          onAcceptAnswer={handleAcceptComment}
          onPromptLogin={onPromptLogin}
        />

        {!post.isLocked && (
          <div style={{ marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Your Response</h3>
            <CommentBox 
              isLoggedIn={isLoggedIn}
              onPromptLogin={onPromptLogin}
              onSubmit={(body) => handleNewComment(body)}
            />
          </div>
        )}
      </div>
      <AdSlot slotKey="leaderboard2" slotName="Leaderboard 2 (728×90)" />
    </div>
  );
}
