const express = require("express");
const { rateLimit } = require("express-rate-limit");
const auth = require("../services/authService");
const entries = require("../services/timetableEntryService");
const { requireSession } = require("../middleware/auth");
const { HttpError } = require("../lib/httpError");

const router = express.Router();
const limitSignIn = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { message: "Too many sign-in attempts. Try again in a few minutes." }
});

router.post("/login", limitSignIn, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const { username, password } = req.body || {};
    res.json(await auth.signIn(username, password));
});

router.get("/me", requireSession, (req, res) => res.json(req.user));

router.post("/logout", requireSession, async (req, res) => {
    await auth.signOut(req.sessionToken);
    res.sendStatus(204);
});

router.get("/timetable", requireSession, async (req, res) => {
    if (req.user.role !== "Teacher") throw new HttpError(403, "Teacher access is required.");
    res.json(await entries.getTimetableForTeacher(req.user.teacherId));
});

module.exports = router;
