import dns from "dns";

// Alguns provedores de internet/roteadores locais não resolvem corretamente
// os registros SRV usados pelo mongodb+srv://. Em produção (Render) o DNS
// já funciona nativamente e forçar um resolver externo pode até quebrar
// (ex: DNS UDP bloqueado na rede do container), então só aplicamos isso
// fora de produção.
if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

// Routes
import * as v1 from "./src/routes/v1/index.js";

// Constants
import { API_HOST, API_PORT } from "./constants.js";

import compression from "compression";
import connectMongo from "./src/models/mongo.js";
import cors from "cors";
import express from "express";
import "express-async-errors";
import fileupload from "express-fileupload";
// Safety
import middleware from "./src/middlewares/middleware.js";
import response from "default-api-response-node";

// Última linha de defesa: nunca deixa um erro fora do ciclo request/response
// (ex: promise sem catch em um serviço) derrubar o processo inteiro.
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

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
app.use("/v1/cliente", v1.cliente);
app.use("/v1/upload", v1.upload)
app.use("/v1/addresses", v1.addresses);
app.use("/v1/payment", v1.payment);
app.use("/v1/security", v1.security);

app.get("/", (req, res) => {
  res.success("Bem Vindo a API do projeto Cacambas");
});

app.get("/healthz", (req, res) => {
  res.success("Healthz OK");
});

// Precisa ser o último app.use: captura qualquer erro (síncrono ou de rota
// async, via express-async-errors) que os controllers não tratarem, e
// responde com erro em vez de deixar a requisição travar ou o processo cair.
app.use((err, req, res, next) => {
  console.error("ERRO NÃO TRATADO:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.error("Erro interno no servidor.");
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
