const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.ecosudar.com/api';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT) || 30000;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add authorization header if token exists
    if (config.token) {
      config.headers.Authorization = `Bearer ${config.token}`;
      delete config.token; // Remove custom token property
    }
    
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error(`[API Error] ${error.response.status} ${error.config.url}`, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('[API Error] No response received', error.message);
    } else {
      // Error in request setup
      console.error('[API Error]', error.message);
    }
    return Promise.reject(error);
  }
);

// Helper function to make API calls
const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: endpoint,
      token, // Custom property for interceptor
    };

    if (data) {
      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    // Re-throw with formatted error
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || error.response.data?.error || 'API request failed',
        data: error.response.data,
      };
    } else {
      throw {
        status: 500,
        message: error.message || 'Network error',
        data: null,
      };
    }
  }
};

// API methods
const api = {
  // Authentication
  auth: {
    register: (data) => makeRequest('POST', '/auth/register', data),
    login: (data) => makeRequest('POST', '/auth/login', data),
    logout: (token, data) => makeRequest('POST', '/auth/logout', data, token),
    me: (token) => makeRequest('GET', '/auth/me', null, token),
    refresh: (data) => makeRequest('POST', '/auth/refresh', data),
    forgotPassword: (data) => makeRequest('POST', '/auth/forgot-password', data),
    verifyOtp: (data) => makeRequest('POST', '/auth/verify-otp', data),
    resetPassword: (token, data) => makeRequest('POST', '/auth/reset-password', data, token),
  },

  // Users
  users: {
    getById: (token, userId) => makeRequest('GET', `/users/${userId}`, null, token),
    getByEmail: (token, email) => makeRequest('GET', `/users/email/${email}`, null, token),
    update: (token, userId, data) => makeRequest('PUT', `/users/${userId}`, data, token),
    updatePassword: (token, userId, data) => makeRequest('PUT', `/users/${userId}/password`, data, token),
    delete: (token, userId) => makeRequest('DELETE', `/users/${userId}`, null, token),
    getOrders: (token, userId, params) => makeRequest('GET', `/users/${userId}/orders`, params, token),
  },

  // Products
  products: {
    getAll: (params) => makeRequest('GET', '/products', params),
    getById: (id) => makeRequest('GET', `/products/${id}`),
    getConfigurations: (id, params) => makeRequest('GET', `/products/${id}/configurations`, params),
  },

  // Orders
  orders: {
    getAll: (token, params) => makeRequest('GET', '/orders', params, token),
    create: (token, data) => makeRequest('POST', '/orders', data, token),
    getById: (token, orderId) => makeRequest('GET', `/orders/${orderId}`, null, token),
    updateStatus: (token, orderId, data) => makeRequest('PUT', `/orders/${orderId}/status`, data, token),
  },

  // Statistics
  statistics: {
    getOrders: (token, params) => makeRequest('GET', '/statistics/orders', params, token),
    getActiveOrders: (token) => makeRequest('GET', '/statistics/active-orders', null, token),
  },
};

module.exports = { api, apiClient, makeRequest };