const auth = (process.env.DB_PROVIDER === "postgres" ? require("../postgres").authService : require("../services/authService"));
const { HttpError } = require("../lib/httpError");

async function requireSession(req, res, next) {
    res.set("Cache-Control", "no-store");
    const [, token] = req.get("Authorization")?.match(/^Bearer ([\w-]{43})$/i) || [];
    if (!token) throw new HttpError(401, "Sign in to continue.");

    const user = await auth.getSession(token);
    if (!user) throw new HttpError(401, "Your session has expired. Sign in again.");

    req.user = user;
    req.sessionToken = token;
    next();
}

function requireAdmin(req, res, next) {
    if (req.user.role !== "Admin") throw new HttpError(403, "Administrator access is required.");
    next();
}

module.exports = { requireSession, requireAdmin };
