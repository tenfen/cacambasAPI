import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ClienteSchema = new Schema(
  {
    clienteId: { type: Number, required: true, unique: true },

    /**
     * Dono do cadastro (userId do proprietário do negócio).
     */
    userId: { type: Number, required: true },

    clienteNome: { type: String, required: true },
    clienteTelefone: { type: String, required: true },

    /**
     * CPF ou CNPJ do cliente.
     */
    clienteDocumento: { type: String, required: false, default: null },

    clienteEmail: { type: String, required: false, default: null },

    clienteAddressName: { type: String, required: false, default: null },
    clienteAddressNumber: { type: String, required: false, default: null },
    clienteAddressComplement: { type: String, required: false, default: null },
    clienteAddressNeighborhood: { type: String, required: false, default: null },
    clienteAddressCity: { type: String, required: false, default: null },
    clienteAddressState: { type: String, required: false, default: null },
    clienteAddressCEP: { type: String, required: false, default: null },
    clienteAddressReference: { type: String, required: false, default: null },

    /**
     * Coordenadas para uso futuro com mapa/roteirização.
     */
    clienteLatitude: { type: Number, required: false, default: null },
    clienteLongitude: { type: Number, required: false, default: null },

    clienteActive: { type: Boolean, required: true, default: true },
    clienteNotes: { type: String, required: false, default: null },

    createdAt: { type: Date, default: Date.now },
    updateAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "clientes",
  }
);

const ClienteModel = mongoose.model("cliente", ClienteSchema);
export default ClienteModel;
