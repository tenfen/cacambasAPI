// Routes
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import * as v1 from "./src/routes/v1/index.js";

// Constants
import { API_HOST, API_PORT } from "./constants.js";

import compression from "compression";
import connectMongo from "./src/models/mongo.js";
import cors from "cors";
import express from "express";
import fileupload from "express-fileupload";
// Safety
import middleware from "./src/middlewares/middleware.js";
import response from "default-api-response-node";

const app = express();

app.use(cors());
app.use(response);
app.use(middleware);
app.use(compression());
app.use(fileupload({}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

global.logging = {
  info: (message, content = null) => {
    if (!!content) {
      console.log(
        "INFO:",
        new Date().toISOString(),
        `=> MSG: "${message}"`,
        "CONTENT:",
        content
      );
    } else {
      console.log("INFO:", new Date().toISOString(), `=> MSG: "${message}"`);
    }
  },
  error: (message, content = []) => {
    if (!!message && !!content) {
      console.error(
        "ERRO:",
        new Date().toISOString(),
        `=> MSG: "${message}"`,
        "CONTENT:",
        content
      );
    } else if (!!message && !content) {
      console.error("ERRO:", new Date().toISOString(), `=> MSG: "${message}"`);
    } else {
      console.error("ERRO:", new Date().toISOString(), "CONTENT:", content);
    }
    return false;
  },
};

app.use('/v1/auth', v1.auth);
app.use("/v1/user", v1.user);
app.use("/v1/bucket", v1.bucket);
app.use("/v1/device", v1.device);
app.use("/v1/upload", v1.upload)
app.use("/v1/addresses", v1.addresses);
app.use("/v1/payment", v1.payment);

app.get("/", (req, res) => {
  res.success("Bem Vindo a API do projeto Cacambas");
});

app.get("/healthz", (req, res) => {
  res.success("Healthz OK");
});

console.log("🔧 API Config:");
console.log("📍 API_HOST:", API_HOST);
console.log("📍 API_PORT:", API_PORT);

app.listen(API_PORT, API_HOST, () => {
  connectMongo();

  console.log("🌎 API Cacambas - Server started gracefully!");
  console.log(`✅ Running on ${API_HOST}:${API_PORT} Press CTRL+C to stop it`);
  console.log(`📱 Emulador AVD deve acessar em: http://10.0.2.2:${API_PORT}`);
});
