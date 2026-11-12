import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * AI Service (Frontend)
 * Communicates with backend AI endpoints
 */

const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

const api = axios.create({
  baseURL: `${API_URL}/ai`,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Check if AI service is available
 */
export const checkAIStatus = async () => {
  try {
    const response = await api.get('/status');
    return response.data;
  } catch (error) {
    console.error('AI status check failed:', error);
    return { success: false, data: { available: true } };
  }
};

/**
 * Send chat message to AI assistant
 * @param {string} message - User message
 * @param {array} conversationHistory - Past conversation messages
 */
export const sendChatMessage = async (message, conversationHistory = [], language = null) => {
  const preferredLanguage = language || localStorage.getItem('preferredLanguage') || 'en';
  const response = await api.post('/chat', { message, conversationHistory, preferredLanguage });
  return response.data;
};

export const analyzeShipment = async (shipmentId) => {
  const response = await api.post(`/analyze-shipment/${shipmentId}`);
  return response.data;
};

export const analyzeDelay = async (shipmentId) => {
  const response = await api.post(`/analyze-delay/${shipmentId}`);
  return response.data;
};

export const summarizeAlerts = async () => {
  const response = await api.post('/summarize-alerts');
  return response.data;
};

export const generateReportInsights = async (reportData) => {
  const response = await api.post('/report-insights', { reportData });
  return response.data;
};

export const generateDashboardInsights = async () => {
  const response = await api.post('/dashboard-insights');
  return response.data;
};

export default {
  checkAIStatus,
  sendChatMessage,
  analyzeShipment,
  analyzeDelay,
  summarizeAlerts,
  generateReportInsights,
  generateDashboardInsights
};
