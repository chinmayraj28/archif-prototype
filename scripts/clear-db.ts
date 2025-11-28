import "dotenv/config";
import mongoose from "mongoose";
import connectToDatabase from "../lib/db";

async function clearDatabase() {
    try {
        console.log("Connecting to database...");
        await connectToDatabase();

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Database connection not initialized");
        }

        const dbName = db.databaseName;
        console.log(`Dropping database: ${dbName}`);

        await db.dropDatabase();

        console.log("✅ Database cleared successfully!");

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error clearing database:", error);
        process.exit(1);
    }
}

clearDatabase();

