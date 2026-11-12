import api from './api';

export const getShipmentRecommendation = async (shipmentId) => {
  return await api.get(`/recommendations/shipment/${shipmentId}`);
};

const recommendationService = {
  getShipmentRecommendation
};

export default recommendationService;
