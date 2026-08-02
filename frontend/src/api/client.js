import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export const api = axios.create({
  baseURL,
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const tok = localStorage.getItem("fg_token");
  if (tok) {
    config.headers.Authorization = `Bearer ${tok}`;
  }
  return config;
});
