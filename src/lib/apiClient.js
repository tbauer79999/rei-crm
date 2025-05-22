// src/lib/apiClient.js
import axios from 'axios';
import { supabase } from './supabaseClient';

const apiClient = axios.create({
  baseURL: '/api', // Assuming all API calls are prefixed with /api
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

export default apiClient;
