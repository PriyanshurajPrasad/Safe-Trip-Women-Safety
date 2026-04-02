import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.patch('/auth/profile', userData),
  changePassword: (passwordData) => api.patch('/auth/change-password', passwordData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  deleteAccount: (password) => api.delete('/auth/delete-account', { data: { password } }),
};

// Trips API
export const tripsAPI = {
  getAllTrips: (params) => api.get('/trips', { params }),
  getActiveTrip: () => api.get('/trips/active'),
  getTripHistory: (params) => api.get('/trips/history', { params }),
  getTripStatistics: () => api.get('/trips/statistics'),
  getTripById: (id) => api.get(`/trips/${id}`),
  startTrip: (tripData) => api.post('/trips/start', tripData),
  updateLocation: (id, coordinates) => api.patch(`/trips/${id}/update-location`, { coordinates }),
  extendTrip: (id, additionalMinutes) => api.patch(`/trips/${id}/extend`, { additionalMinutes }),
  confirmSafe: (id) => api.post(`/trips/${id}/confirm-safe`),
  cancelTrip: (id) => api.delete(`/trips/${id}/cancel`),
};

// Contacts API
export const contactsAPI = {
  getAllContacts: (params) => api.get('/contacts', { params }),
  getEmergencyList: () => api.get('/contacts/emergency-list'),
  getPrimaryContact: () => api.get('/contacts/primary'),
  getContactById: (id) => api.get(`/contacts/${id}`),
  createContact: (contactData) => api.post('/contacts', contactData),
  updateContact: (id, contactData) => api.patch(`/contacts/${id}`, contactData),
  deleteContact: (id) => api.delete(`/contacts/${id}`),
  setPrimaryContact: (id) => api.patch(`/contacts/${id}/set-primary`),
  updatePriorities: (contacts) => api.patch('/contacts/update-priorities', { contacts }),
};

// SOS API
export const sosAPI = {
  triggerManualSOS: (sosData) => api.post('/sos/manual', sosData),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health', { baseURL: 'http://localhost:3000' }),
};

export default api;
