import mongoose from "mongoose";
import { MONGO_DB, MONGO_URI } from "../../constants.js";

export default function connectMongo() {
  const url = `${MONGO_URI}/${MONGO_DB}`;
  console.log("MONGO URL", url);
  try {
    mongoose.connect(url);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const dbConnection = mongoose.connection;
  dbConnection.once("open", (_) => {
    console.log(`Database connected: ${url}`);
  });

  dbConnection.on("error", (err) => {
    console.error(`connection error: ${err}`);
  });
  return;
}
