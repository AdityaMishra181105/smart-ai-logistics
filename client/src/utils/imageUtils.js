/**
 * Format a profile image path or URL into a valid browser image source URL.
 * Handles absolute URLs, data URIs, and backend static relative paths like /uploads/profile/...
 */
export const getProfileImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${backendOrigin}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};
