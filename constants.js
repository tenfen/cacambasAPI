import dotenv from "dotenv"
dotenv.config()

// API
const API_HOST = process.env.API_HOST || "0.0.0.0"
const API_PORT = process.env.PORT || process.env.API_PORT

// MONGO
const MONGO_DB = process.env.MONGO_DB
const MONGO_URI = process.env.MONGO_URI

export { API_HOST, API_PORT, MONGO_URI, MONGO_DB }
