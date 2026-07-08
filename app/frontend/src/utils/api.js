import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use(config => {
  const token = localStorage.getItem("oe_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("oe_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
