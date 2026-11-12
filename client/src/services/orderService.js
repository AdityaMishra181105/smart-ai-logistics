import api from './api';

export const createOrder = async (data) => {
  return await api.post('/orders', data);
};

export const getOrders = async (params = {}) => {
  return await api.get('/orders', { params });
};

export const getOrderById = async (id) => {
  return await api.get(`/orders/${id}`);
};

export const updateOrder = async (id, data) => {
  return await api.put(`/orders/${id}`, data);
};

export const updateOrderStatus = async (id, status) => {
  return await api.patch(`/orders/${id}/status`, { status });
};

export const deleteOrder = async (id) => {
  return await api.delete(`/orders/${id}`);
};

const orderService = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
};

export default orderService;
