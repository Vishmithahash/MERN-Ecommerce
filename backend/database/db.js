require('dotenv').config()
const mongoose = require("mongoose")

exports.connectToDB = async () => {
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes("REPLACE_WITH_")) {
        console.error("Database connection error: MONGO_URI is missing or unconfigured.");
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('connected to DB');
    } catch (error) {
        console.error('Database connection error: Failed to connect to MongoDB.');
    }
}