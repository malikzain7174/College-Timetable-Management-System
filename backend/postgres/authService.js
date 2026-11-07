"use strict";

const { createHash, randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { getPgPool, withPgTransaction, withPgAdvisoryLock } = require("./client");
const { HttpError } = require("../lib/httpError");

const SESSION_HOURS = 8;
const DUMMY_HASH = bcrypt.hashSync("unavailable-account", 12);
const hashToken = token => createHash("sha256").update(token).digest();
const userInfo = row => ({ userId: row.UserId, username: row.Username, role: row.Role, teacherId: row.TeacherId });

/**
 * Separate PostgreSQL authentication service. Deliberately not wired into
 * server.js until every dependent service has been migrated and tested.
 * The optional pool argument allows isolated tests without Neon credentials.
 */
function createPostgresAuthService(pool = getPgPool(), locks = withPgAdvisoryLock) {
  async function signIn(username, password) {
    if (typeof username !== "string" || !username.trim() || username.trim().length > 100 ||
        typeof password !== "string" || !password.length || Buffer.byteLength(password) > 72) {
      throw new HttpError(400, "Enter a valid username and password.");
    }
    const { rows: [user] } = await pool.query(`
      SELECT u."UserId", u."Username", u."TeacherId", u."PasswordHash", u."Role", u."AuthVersion"
      FROM "Users" u LEFT JOIN "Teachers" t ON t."TeacherId" = u."TeacherId"
      WHERE u."Username" = $1 AND u."IsActive" = 1
        AND (u."Role" = 'Admin' OR (u."Role" = 'Teacher' AND t."IsActive" = 1))
    `, [username.trim()]);
    const matches = await bcrypt.compare(password, user?.PasswordHash || DUMMY_HASH);
    if (!matches || !user) throw new HttpError(401, "Invalid username or password.");

    const token = randomBytes(32).toString("base64url");
    const tokenDigest = hashToken(token);
    const session = await withPgTransaction(async client => {
      await client.query(`DELETE FROM "UserSessions" WHERE "UserId" = $1 AND "ExpiresAt" <= (now() AT TIME ZONE 'UTC')`, [user.UserId]);
      const { rows: [created] } = await client.query(`
        INSERT INTO "UserSessions" ("TokenHash", "UserId", "AuthVersion", "ExpiresAt")
        SELECT $1::bytea, "UserId", "AuthVersion", (now() AT TIME ZONE 'UTC') + ($3::integer * interval '1 hour')
        FROM "Users" WHERE "UserId" = $2 AND "AuthVersion" = $4 AND "IsActive" = 1
        RETURNING "ExpiresAt"
      `, [tokenDigest, user.UserId, SESSION_HOURS, user.AuthVersion]);
      if (created) {
        await client.query(`UPDATE "Users" SET "LastLoginAt" = (now() AT TIME ZONE 'UTC') WHERE "UserId" = $1`, [user.UserId]);
      }
      return created;
    }, pool);
    if (!session) throw new HttpError(401, "Account access changed. Sign in again.");
    return { token, expiresAt: session.ExpiresAt, user: userInfo(user) };
  }

  async function getSession(token) {
    if (typeof token !== "string" || !/^[\w-]{43}$/.test(token)) return null;
    const { rows: [user] } = await pool.query(`
      SELECT u."UserId", u."Username", u."TeacherId", u."Role"
      FROM "UserSessions" s
      JOIN "Users" u ON u."UserId" = s."UserId" AND u."AuthVersion" = s."AuthVersion"
      LEFT JOIN "Teachers" t ON t."TeacherId" = u."TeacherId"
      WHERE s."TokenHash" = $1::bytea AND s."ExpiresAt" > (now() AT TIME ZONE 'UTC')
        AND u."IsActive" = 1 AND (u."Role" = 'Admin' OR (u."Role" = 'Teacher' AND t."IsActive" = 1))
    `, [hashToken(token)]);
    return user ? userInfo(user) : null;
  }

  async function signOut(token) {
    if (typeof token !== "string" || !/^[\w-]{43}$/.test(token)) return;
    await pool.query(`DELETE FROM "UserSessions" WHERE "TokenHash" = $1::bytea`, [hashToken(token)]);
  }

  async function provisionAdmin(username, password, rotate = false) {
    if (typeof username !== "string" || !username.trim() || username.trim().length > 100) {
      throw new Error("Supply an admin username of at most 100 characters.");
    }
    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password) > 72) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters and at most 72 bytes.");
    }
    const digest = await bcrypt.hash(password, 12);
    return locks("timetable:admin-provisioning", async client => {
      const { rows: [account] } = await client.query(`SELECT "UserId", "Role" FROM "Users" WHERE "Username" = $1 FOR UPDATE`, [username.trim()]);
      if (account && (!rotate || account.Role !== "Admin")) {
        throw new Error("This username is already in use. --rotate applies to existing admins.");
      }
      if (!account && rotate) throw new Error("The requested administrator does not exist.");
      if (account) {
        await client.query(`UPDATE "Users" SET "PasswordHash" = $1, "AuthVersion" = "AuthVersion" + 1, "UpdatedAt" = (now() AT TIME ZONE 'UTC') WHERE "UserId" = $2`, [digest, account.UserId]);
        await client.query(`DELETE FROM "UserSessions" WHERE "UserId" = $1`, [account.UserId]);
        await client.query(`UPDATE "PasswordResetTokens" SET "UsedAt" = (now() AT TIME ZONE 'UTC') WHERE "UserId" = $1 AND "UsedAt" IS NULL`, [account.UserId]);
        return "Administrator password rotated and previous sessions revoked.";
      }
      await client.query(`INSERT INTO "Users" ("Username", "PasswordHash", "Role", "IsActive", "CreatedAt", "AuthVersion") VALUES ($1, $2, 'Admin', 1, (now() AT TIME ZONE 'UTC'), 0)`, [username.trim(), digest]);
      return "Administrator created.";
    }, pool);
  }

  return { signIn, getSession, signOut, provisionAdmin };
}

module.exports = { createPostgresAuthService };
