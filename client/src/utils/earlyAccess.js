/**
 * Checks if a post is under active Early Access and if the current user is authorized to view it.
 * Early Access conditions:
 * 1. Post was written by an editor or admin.
 * 2. Post was created less than 10 days ago.
 * 
 * Authorized users:
 * - Admin, Editor, or Author roles.
 * - Basic, Pro, Elite, or Institutional plans.
 * 
 * @param {Object} post - The post object containing createdAt and author information.
 * @param {Object} currentUser - The currently logged-in user object.
 * @returns {Object} - Object containing isEarlyAccess, isAuthorized, and daysRemaining.
 */
export function checkEarlyAccess(post, currentUser) {
  if (!post || !post.createdAt) {
    return { isEarlyAccess: false, isAuthorized: true, daysRemaining: 0 };
  }

  const authorRole = post.author?.role || '';
  const isAuthorStaff = authorRole === 'admin' || authorRole === 'editor';

  if (!isAuthorStaff) {
    return { isEarlyAccess: false, isAuthorized: true, daysRemaining: 0 };
  }

  const postDate = new Date(post.createdAt);
  const diffTime = Date.now() - postDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  const isEarlyAccess = diffDays < 10;
  const daysRemaining = Math.max(0, Math.ceil(10 - diffDays));

  // Access check
  const userRole = currentUser?.role;
  const userPlan = (currentUser?.subscriptionTier || 'free').toLowerCase();

  const isStaff = ['admin', 'editor', 'author'].includes(userRole);
  const isPremium = ['basic', 'pro', 'elite', 'institutional'].includes(userPlan);

  const isAuthorized = isStaff || isPremium;

  return {
    isEarlyAccess,
    isAuthorized,
    daysRemaining
  };
}
