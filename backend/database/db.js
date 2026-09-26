require('dotenv').config()
const mongoose = require("mongoose")

const User = require("../models/User");
const Otp = require("../models/OTP");

exports.connectToDB = async () => {
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes("REPLACE_WITH_")) {
        console.error("Database connection error: MONGO_URI is missing or unconfigured.");
        throw new Error("MONGO_URI is missing or unconfigured.");
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await User.createIndexes();
        await Otp.createIndexes();
        console.log('connected to DB');
    } catch (error) {
        console.error('Database connection error: Failed to connect to MongoDB.');
        throw new Error("Failed to connect to MongoDB.");
    }
}