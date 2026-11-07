require("dotenv").config({ quiet: true });

const { HttpError } = require("../lib/httpError");

const defaultAuth = process.platform === "win32" ? "windows" : "sql";
const useWindowsAuth = (process.env.DB_AUTH || defaultAuth).toLowerCase() === "windows";
const sql = useWindowsAuth ? require("mssql/msnodesqlv8") : require("mssql");

const database = process.env.DB_DATABASE || "CollegeTimetableDB";
const port = Number(process.env.DB_PORT || 1433);
const trustServerCertificate = String(process.env.DB_TRUST_SERVER_CERTIFICATE).toLowerCase() === "true";
const poolSettings = { max: Number(process.env.DB_POOL_MAX || 10), min: 0, idleTimeoutMillis: 30000 };
const config = useWindowsAuth
    ? {
        connectionString:
            `Driver={${process.env.DB_ODBC_DRIVER || "ODBC Driver 17 for SQL Server"}};` +
            `Server=${process.env.DB_SERVER || "localhost"},${port};` +
            `Database=${database};Trusted_Connection=Yes;` +
            `TrustServerCertificate=${trustServerCertificate ? "Yes" : "No"};`,
        connectionTimeout: 5000,
        pool: poolSettings
    }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER || "localhost",
        database,
        port,
        connectionTimeout: 5000,
        pool: poolSettings,
        options: {
            encrypt: true,
            trustServerCertificate
        }
    };

let connection;

function getPool() {
    if (!connection) {
        connection = Promise.resolve()
            .then(async () => {
                const pool = new sql.ConnectionPool(config);
                pool.on("error", error => console.error("SQL Server pool error:", error.code));
                return pool.connect();
            })
            .catch(error => {
                connection = undefined;
                console.error("SQL Server connection failed:", error.code || error.message);
                throw new HttpError(503, "Database unavailable. Check the SQL Server connection.");
            });
    }
    return connection;
}

// Existing data services await this handle. Connect lazily so health checks can
// report a failed startup and retry after SQL Server becomes available.
const poolPromise = { then: (resolve, reject) => getPool().then(resolve, reject) };

async function closePool() {
    const current = connection;
    connection = undefined;
    if (current) await (await current).close();
}

async function withDatabaseLock(resource, operation) {
    const transaction = new sql.Transaction(await getPool());
    await transaction.begin();
    const executor = { request: () => new sql.Request(transaction) };

    try {
        const result = await executor.request()
            .input("resource", sql.NVarChar(255), resource)
            .query(`
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock
                    @Resource = @resource, @LockMode = 'Exclusive',
                    @LockOwner = 'Transaction', @LockTimeout = 10000;
                SELECT @result AS lockResult;
            `);
        if (result.recordset[0].lockResult < 0) {
            throw new HttpError(409, "A conflicting change is in progress. Try again.");
        }
        const value = await operation(executor);
        await transaction.commit();
        return value;
    } catch (error) {
        // SQL Server may already have rolled back the transaction after an error.
        await transaction.rollback().catch(() => {});
        throw error;
    }
}

module.exports = { sql, poolPromise, getPool, closePool, withDatabaseLock };
