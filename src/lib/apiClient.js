// src/lib/apiClient.js
import axios from 'axios';
import supabase from './supabaseClient';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// A/B Testing API calls
export const experimentsAPI = {
  getAll: () => apiClient.get('/experiments'),
  create: (data) => apiClient.post('/experiments', data),
  getById: (id) => apiClient.get(`/experiments/${id}`),
  updateStatus: (id, status) => apiClient.put(`/experiments/${id}/status`, { status }),
  declareWinner: (id, winner) => apiClient.post(`/experiments/${id}/declare-winner`, { winner })
};

export default apiClient;