import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || !window.location.hostname
    ? 'http://localhost:5000/api/forum' 
    : 'https://bioxape-backend.onrender.com/api/forum'
);

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to attach jwt token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bioxape_token') || document.cookie.split('; ').find(row => row.startsWith('bioxape_token='))?.split('=')[1];
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let categoriesCache = null;
export const getCategories = async () => {
  if (categoriesCache) {
    return categoriesCache;
  }
  categoriesCache = await api.get('/categories');
  return categoriesCache;
};
export const getPosts = (params) => api.get('/posts', { params });
export const getPostById = (id) => api.get(`/posts/${id}`);
export const createPost = (data) => api.post('/posts', data);
export const updatePost = (id, data) => api.put(`/posts/${id}`, data);
export const deletePost = (id) => api.delete(`/posts/${id}`);
export const votePost = (id, type) => api.post(`/posts/${id}/vote`, { type });
export const getComments = (postId) => api.get(`/posts/${postId}/comments`);
export const createComment = (postId, data) => api.post(`/posts/${postId}/comments`, data);
export const updateComment = (id, data) => api.put(`/comments/${id}`, data);
export const deleteComment = (id) => api.delete(`/comments/${id}`);
export const voteComment = (id, type) => api.post(`/comments/${id}/vote`, { type });
export const acceptComment = (id) => api.post(`/comments/${id}/accept`);
export const searchPosts = (q) => api.get(`/search?q=${encodeURIComponent(q)}`);
export const getTrending = () => api.get('/trending');

export default {
  getCategories,
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  votePost,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  voteComment,
  acceptComment,
  searchPosts,
  getTrending
};
