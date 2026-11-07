import axios from "axios";

const tokenKey = "college-timetable-session";
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
export const apiUrl = path => `${API_BASE_URL}${path}`;
export const getSessionToken = () => sessionStorage.getItem(tokenKey);

export function setSessionToken(token) {
    if (token) sessionStorage.setItem(tokenKey, token);
    else sessionStorage.removeItem(tokenKey);
}

export const api = axios.create({ timeout: 45000 });

api.interceptors.request.use(config => {
    const token = getSessionToken();
    const origin = new URL(API_BASE_URL || "/", window.location.origin).origin;
    if (token && new URL(config.url, window.location.origin).origin === origin) {
        config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
});

api.interceptors.response.use(undefined, error => {
    const token = getSessionToken();
    if (error.response?.status === 401 && token &&
        error.config?.headers?.get("Authorization") === `Bearer ${token}`) {
        setSessionToken(null);
        window.dispatchEvent(new Event("timetable-session-expired"));
    }
    return Promise.reject(error);
});
