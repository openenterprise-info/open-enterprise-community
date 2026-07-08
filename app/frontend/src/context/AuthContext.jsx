import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

function getStoredToken() {
  return localStorage.getItem("oe_token") || sessionStorage.getItem("oe_token");
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      let sso = false;
      try { sso = !!JSON.parse(atob(token.split(".")[1])).sso; } catch {}
      api.get("/auth/me")
        .then(r => setUser({ ...r.data.user, sso }))
        .catch(() => {
          localStorage.removeItem("oe_token");
          sessionStorage.removeItem("oe_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function login(token, userData, remember = true) {
    if (remember) {
      localStorage.setItem("oe_token", token);
      sessionStorage.removeItem("oe_token");
    } else {
      sessionStorage.setItem("oe_token", token);
      localStorage.removeItem("oe_token");
    }
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("oe_token");
    sessionStorage.removeItem("oe_token");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
