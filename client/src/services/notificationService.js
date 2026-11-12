import api from './api';

export const getNotifications = async (params = {}) => {
  return await api.get('/notifications', { params });
};

export const getUnreadCount = async () => {
  return await api.get('/notifications/unread-count');
};

export const markRead = async (id) => {
  return await api.patch(`/notifications/${id}/read`);
};

export const markAllRead = async () => {
  return await api.patch('/notifications/mark-all-read');
};

export const deleteNotification = async (id) => {
  return await api.delete(`/notifications/${id}`);
};

const notificationService = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification
};

export default notificationService;
