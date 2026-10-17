require("dotenv").config();

const useWindowsAuth =
    String(process.env.DB_AUTH || "windows").toLowerCase() === "windows";

const sql = useWindowsAuth
    ? require("mssql/msnodesqlv8")
    : require("mssql");

let config;

if (useWindowsAuth) {
    config = {
        connectionString:
            `Driver={${process.env.DB_ODBC_DRIVER || "ODBC Driver 17 for SQL Server"}};` +
            `Server=${process.env.DB_SERVER || "localhost"},${process.env.DB_PORT || "1433"};` +
            `Database=${process.env.DB_DATABASE || "CollegeTimetableDB"};` +
            "Trusted_Connection=Yes;" +
            "TrustServerCertificate=Yes;"
    };
} else {
    config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE || "CollegeTimetableDB",
        port: Number(process.env.DB_PORT || 1433),
        options: {
            encrypt: true,
            trustServerCertificate:
                String(process.env.DB_TRUST_SERVER_CERTIFICATE || "false").toLowerCase() === "true"
        },
        pool: {
            max: Number(process.env.DB_POOL_MAX || 10),
            min: 0,
            idleTimeoutMillis: 30000
        }
    };
}

console.log(
    `Starting SQL Server connection in ${useWindowsAuth ? "Windows Auth" : "SQL Auth"} mode...`
);

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log("Connected to SQL Server successfully!");
        return pool;
    })
    .catch(error => {
        console.error("Database connection failed:");
        console.error(error);
        throw error;
    });

module.exports = {
    sql,
    poolPromise
};
