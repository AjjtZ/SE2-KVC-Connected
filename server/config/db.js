const mysql = require("mysql2/promise");
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
};

console.log("Database Config:", {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database
});

const db = mysql.createPool(dbConfig);

async function testConnection(db) {
    try {
        const connection = await db.getConnection();
        console.log("✅ Successfully connected to MySQL database:", dbConfig.database);
        connection.release();
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        if (process.env.NODE_ENV === 'production') {
            console.error("❌ Exiting process due to database connection failure.");
            process.exit(1); 
        }
        throw err; 
    }
}


(async () => {
    try {
        await testConnection(db);
    } catch (err) {
        // Handle error if connection fails during initial setup
        console.error("❌ Initial database connection test failed.");
    }
})();

module.exports = {db, dbConfig, mysql, path, dotenv};