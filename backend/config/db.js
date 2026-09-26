const sql = require("mssql/msnodesqlv8");

const config = {
    connectionString:
        "Driver={ODBC Driver 17 for SQL Server};" +
        "Server=localhost,1433;" +
        "Database=CollegeTimetableDB;" +
        "Trusted_Connection=Yes;" +
        "TrustServerCertificate=Yes;"
};

console.log("Starting SQL Server connection...");

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