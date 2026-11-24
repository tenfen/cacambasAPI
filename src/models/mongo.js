import mongoose from "mongoose";
import { converterClientesAntigos } from "../services/locacaoService.js";
import { MONGO_DB, MONGO_URI } from "../../constants.js";

export default function connectMongo() {
  const url = `${MONGO_URI}/${MONGO_DB}`;
  try {
    mongoose.connect(url);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const dbConnection = mongoose.connection;
  dbConnection.once("open", (_) => {
    console.log(`Database connected: ${MONGO_DB}`);

    // Só grava na coleção "locacoes" e não duplica ao reiniciar.
    converterClientesAntigos()
      .then((resumo) => console.log("Conversão de locações:", JSON.stringify(resumo)))
      .catch((err) => console.error("Erro na conversão de locações:", err));
  });

  dbConnection.on("error", (err) => {
    console.error(`connection error: ${err}`);
  });
  return;
}
