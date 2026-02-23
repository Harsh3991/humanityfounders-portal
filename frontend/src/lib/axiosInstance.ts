import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the auth token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('hf_access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration (optional but good practice)
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized (e.g., clear token, redirect to login)
            localStorage.removeItem('hf_access_token');
            localStorage.removeItem('hf_refresh_token');
            // If window.location is necessary, you can push to login:
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
