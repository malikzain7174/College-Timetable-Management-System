const rawBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000";

export const API_BASE_URL =
    rawBaseUrl.replace(/\/$/, "");

export const apiUrl = path => {
    const normalizedPath =
        String(path || "").startsWith("/")
            ? String(path)
            : `/${String(path || "")}`;

    return `${API_BASE_URL}${normalizedPath}`;
};
