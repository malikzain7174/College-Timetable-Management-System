const { createHash, randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { sql, getPool, withDatabaseLock } = require("../config/db");
const { HttpError } = require("../lib/httpError");

const sessionHours = 8;
const dummyHash = bcrypt.hashSync("unavailable-account", 12);
const tokenHash = token => createHash("sha256").update(token).digest();

function userInfo(row) {
    return { userId: row.UserId, username: row.Username, role: row.Role, teacherId: row.TeacherId };
}

async function signIn(username, password) {
    if (
        typeof username !== "string" || !username.trim() || username.trim().length > 100 ||
        typeof password !== "string" || !password.length || Buffer.byteLength(password) > 72
    ) {
        throw new HttpError(400, "Enter a valid username and password.");
    }

    const pool = await getPool();
    const { recordset: [user] } = await pool.request()
        .input("username", sql.NVarChar(100), username.trim())
        .query(`
            SELECT u.UserId, u.Username, u.TeacherId, u.PasswordHash, u.Role, u.AuthVersion
            FROM dbo.Users u
            LEFT JOIN dbo.Teachers t ON t.TeacherId = u.TeacherId
            WHERE u.Username = @username AND u.IsActive = 1
                AND (u.Role = 'Admin' OR (u.Role = 'Teacher' AND t.IsActive = 1));
        `);
    const matches = await bcrypt.compare(password, user?.PasswordHash || dummyHash);
    if (!matches || !user) throw new HttpError(401, "Invalid username or password.");

    const token = randomBytes(32).toString("base64url");
    const { recordset: [session] } = await pool.request()
        .input("userId", sql.Int, user.UserId)
        .input("version", sql.Int, user.AuthVersion)
        .input("tokenHash", sql.Binary(32), tokenHash(token))
        .input("hours", sql.Int, sessionHours)
        .query(`
            DELETE FROM dbo.UserSessions WHERE UserId = @userId AND ExpiresAt <= SYSUTCDATETIME();
            INSERT dbo.UserSessions (TokenHash, UserId, AuthVersion, ExpiresAt)
            OUTPUT INSERTED.ExpiresAt
            SELECT @tokenHash, UserId, AuthVersion, DATEADD(hour, @hours, SYSUTCDATETIME())
            FROM dbo.Users WHERE UserId = @userId AND AuthVersion = @version AND IsActive = 1;
            IF @@ROWCOUNT = 1
                UPDATE dbo.Users SET LastLoginAt = SYSUTCDATETIME() WHERE UserId = @userId;
        `);
    if (!session) throw new HttpError(401, "Account access changed. Sign in again.");

    return { token, expiresAt: session.ExpiresAt, user: userInfo(user) };
}

async function getSession(token) {
    const pool = await getPool();
    const { recordset: [user] } = await pool.request()
        .input("tokenHash", sql.Binary(32), tokenHash(token))
        .query(`
            SELECT u.UserId, u.Username, u.TeacherId, u.Role
            FROM dbo.UserSessions s
            JOIN dbo.Users u ON u.UserId = s.UserId AND u.AuthVersion = s.AuthVersion
            LEFT JOIN dbo.Teachers t ON t.TeacherId = u.TeacherId
            WHERE s.TokenHash = @tokenHash AND s.ExpiresAt > SYSUTCDATETIME()
                AND u.IsActive = 1 AND (u.Role = 'Admin' OR (u.Role = 'Teacher' AND t.IsActive = 1));
        `);
    return user ? userInfo(user) : null;
}

async function signOut(token) {
    const pool = await getPool();
    await pool.request()
        .input("tokenHash", sql.Binary(32), tokenHash(token))
        .query("DELETE FROM dbo.UserSessions WHERE TokenHash = @tokenHash;");
}

async function provisionAdmin(username, password, rotate) {
    if (!username?.trim() || username.trim().length > 100) {
        throw new Error("Supply an admin username of at most 100 characters.");
    }
    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password) > 72) {
        throw new Error("ADMIN_PASSWORD must contain at least 12 characters and at most 72 bytes.");
    }

    const hash = await bcrypt.hash(password, 12);
    return withDatabaseLock("timetable:admin-provisioning", async db => {
        const { recordset: [account] } = await db.request()
            .input("username", sql.NVarChar(100), username.trim())
            .query("SELECT UserId, Role FROM dbo.Users WHERE Username = @username;");
        if (account && (!rotate || account.Role !== "Admin")) {
            throw new Error("This username is already in use. --rotate applies to existing admins.");
        }
        if (!account && rotate) throw new Error("The requested administrator does not exist.");

        if (account) {
            await db.request().input("id", sql.Int, account.UserId)
                .input("hash", sql.NVarChar(255), hash)
                .query(`
                    UPDATE dbo.Users
                    SET PasswordHash = @hash, AuthVersion = AuthVersion + 1, UpdatedAt = SYSUTCDATETIME()
                    WHERE UserId = @id;
                    DELETE FROM dbo.UserSessions WHERE UserId = @id;
                    UPDATE dbo.PasswordResetTokens SET UsedAt = SYSUTCDATETIME()
                    WHERE UserId = @id AND UsedAt IS NULL;
                `);
            return "Administrator password rotated and previous sessions revoked.";
        }

        await db.request()
            .input("username", sql.NVarChar(100), username.trim())
            .input("hash", sql.NVarChar(255), hash)
            .query(`
                INSERT dbo.Users (Username, PasswordHash, Role, IsActive, CreatedAt, AuthVersion)
                VALUES (@username, @hash, 'Admin', 1, SYSUTCDATETIME(), 0);
            `);
        return "Administrator created.";
    });
}

module.exports = { signIn, getSession, signOut, provisionAdmin };
