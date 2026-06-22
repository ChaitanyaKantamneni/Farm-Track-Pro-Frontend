import axios from "axios";

/**
 * Shared Axios client configuration for FarmTrackPro.
 * Sets the base URL for the REST API.
 */
const apiClient = axios.create({
  baseURL: "http://localhost:5000/api"
});

/**
 * Request interceptor to automatically attach JWT authorization tokens.
 * Intercepts every outgoing request and embeds the 'Authorization' Bearer token if present in localStorage.
 */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
