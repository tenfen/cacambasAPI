import mongoose from "mongoose";
import Assistance from "../src/models/assistances.js"; // Importa o modelo
import dotenv from "dotenv"
import connectMongo from "../src/models/mongo.js";
dotenv.config()
// Conectar ao MongoDB
/*
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => console.error('Erro ao conectar:', err));
    */
    connectMongo();

const newAssistance = new Assistance({
    assistanceName: 'Assistência Técnica XPTO',
    assistanceDescription: 'Conserto de eletrônicos e informática.',
    assistanceLocation: {
        type: 'Point',
        coordinates: [-48.6128, -27.5884], // [longitude, latitude]
    },
    assistancePhone: '4891234-5678',
    
});

// Salvar no banco de dados
newAssistance.save()
.then(() => {
    console.log('Assistência salva com sucesso!', newAssistance);
    mongoose.connection.close(); // Fechar a conexão após a inserção
})
.catch(err => {
    console.error('Erro ao salvar:', err);
    mongoose.connection.close();
});