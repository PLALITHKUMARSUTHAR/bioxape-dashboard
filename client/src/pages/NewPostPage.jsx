import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { getCategories, createPost } from '../api/forum';

export default function NewPostPage({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      navigate('/');
      return;
    }

    const loadCategories = async () => {
      try {
        const res = await getCategories();
        const data = res.data?.data || [];
        setCategories(data);
        
        // Use default category if passed via router state
        const defaultCatId = location.state?.defaultCategoryId;
        if (defaultCatId) {
          setSelectedCategory(defaultCatId);
        } else if (data.length > 0) {
          setSelectedCategory(data[0]._id);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    loadCategories();
  }, [currentUser, navigate, location.state]);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/[^a-zA-Z0-9-]/g, '');
      if (cleanTag && !tags.includes(cleanTag) && tags.length < 5) {
        setTags([...tags, cleanTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (title.trim().length < 10) {
      setError('Title must be at least 10 characters long.');
      return;
    }
    if (title.trim().length > 150) {
      setError('Title must not exceed 150 characters.');
      return;
    }
    if (!selectedCategory) {
      setError('Please select a category.');
      return;
    }
    if (body.trim().length < 30) {
      setError('Body description must be at least 30 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await createPost({
        title: title.trim(),
        body: body.trim(),
        category: selectedCategory,
        tags
      });

      if (res.data?.success) {
        navigate(`/post/${res.data.data._id}`);
      } else {
        setError(res.data?.message || 'Failed to publish discussion.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bx-wrap" style={{ padding: '40px 0' }}>
      <div className="new-post-container">
        <h1>Create a New Discussion</h1>
        
        {error && (
          <div style={{ color: 'var(--red)', background: 'var(--red-l)', border: '1px solid var(--red)', padding: '12px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Discussion Title</label>
            <input
              type="text"
              id="title"
              className="form-control"
              placeholder="What is your discussion or question about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              required
            />
            <div className="char-counter">{title.length} / 150 characters</div>
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                className="form-control"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label htmlFor="tags">Tags (Max 5, Press Enter to add)</label>
              <input
                type="text"
                id="tags"
                className="form-control"
                placeholder="e.g. crispr, genomics"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                disabled={tags.length >= 5}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="tag-badge active"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleRemoveTag(idx)}
                  >
                    #{tag} <span style={{ fontSize: '10px', fontWeight: 'bold' }}>×</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group" data-color-mode="light">
            <label>Discussion Body (Markdown supported)</label>
            <MDEditor
              value={body}
              onChange={setBody}
              preview="edit"
              height={300}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '30px' }}>
            <button 
              type="button" 
              className="btn-page" 
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit-post"
              disabled={loading}
            >
              {loading ? 'Publishing...' : 'Publish Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
