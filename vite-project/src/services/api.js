import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearAuth,
} from "../utils/auth.js";

const ENV = {
  dev: {
    // BASE_URL: ' https://ls6cx6sb-8080.inc1.devtunnels.ms/', // devtunnel
    BASE_URL: 'https://taylor-unirritant-latina.ngrok-free.dev', // ngrok
  },
  staging: {
    BASE_URL: 'https://jih-api.ethicalint.com',
  },
  prod: {
    BASE_URL: 'https://jih-api.ethicalint.com',
  },
};

const getEnvVars = (env = 'dev') => {
  if (!ENV[env]) {
    throw new Error(`Unknown environment: ${env}`);
  }
  return ENV[env];
};

const currentEnv = getEnvVars(); // Sirf upar getEnvVars(env = '...') me change karein
export const BASE_URL = currentEnv.BASE_URL || ENV.prod.BASE_URL;
export const API_URL = BASE_URL;
export const PROD_API_URL = ENV.prod.BASE_URL;
export const DEVTUNNEL_API_URL = ENV.dev.BASE_URL;

// Attach global default headers to raw axios as well as a safety measure
axios.defaults.headers.common["ngrok-skip-browser-warning"] = "69420";
axios.defaults.headers.common["Accept"] = "application/json";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "ngrok-skip-browser-warning": "69420",
  },
});

// Add access token and ngrok bypass to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();

  config.headers = config.headers || {};
  config.headers["ngrok-skip-browser-warning"] = "69420";
  if (!config.headers["Accept"]) {
    config.headers["Accept"] = "application/json";
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle expired access token
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/logout') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    try {
      const refreshUrl = `${BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`}api/v1/auth/refresh`;
      const response = await axios.post(
        refreshUrl,
        {
          refreshToken: refreshToken,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "ngrok-skip-browser-warning": "69420",
          },
        }
      );

      const newAccessToken = response.data?.data?.accessToken;

    
      if (!newAccessToken) {
        throw new Error("No access token returned");
      }

      // Save new access token
      setAccessToken(newAccessToken);

      // Retry original request
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
      originalRequest.headers["ngrok-skip-browser-warning"] = "69420";

      return api(originalRequest);

    } catch (refreshErr) {
      clearAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = "/login";
      }
      return Promise.reject(refreshErr);
    }
  }
);

export { ENV, getEnvVars };
export default getEnvVars;
