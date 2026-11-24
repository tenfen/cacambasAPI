import mongoose from "mongoose";

const Schema = mongoose.Schema;

/**
 * Um aluguel de caçamba. Abre quando a caçamba é vinculada ao cliente e
 * fecha no recolhimento. Guarda cópia dos nomes para o histórico continuar
 * legível mesmo se o cliente ou a caçamba forem excluídos.
 */
const LocacaoSchema = new Schema(
  {
    userId: { type: Number, required: true, index: true },
    clienteId: { type: Number, required: true, index: true },
    clienteNome: { type: String, default: null },

    bucketId: { type: Number, default: null },
    bucketName: { type: String, default: null },
    bucketNumber: { type: String, default: null },

    status: {
      type: String,
      enum: ["aberta", "concluida", "cancelada"],
      default: "aberta",
    },

    dataEntrada: { type: Date, default: null },
    dataPrevista: { type: Date, default: null },
    dataRecolhimento: { type: Date, default: null },

    /** Valor fechado, congelado no recolhimento. */
    valor: { type: Number, default: null },

    /**
     * Preenchido só nos registros convertidos do formato antigo (um por
     * cliente). Permite repetir a conversão sem duplicar.
     */
    legacyClienteId: { type: Number },
  },
  {
    collection: "locacoes",
    timestamps: true,
  }
);

// Uma caçamba só pode estar com um cliente por vez, e vice-versa.
LocacaoSchema.index(
  { bucketId: 1 },
  { unique: true, partialFilterExpression: { status: "aberta" }, name: "bucket_aberta" }
);
LocacaoSchema.index(
  { clienteId: 1 },
  { unique: true, partialFilterExpression: { status: "aberta" }, name: "cliente_aberta" }
);
LocacaoSchema.index(
  { legacyClienteId: 1 },
  {
    unique: true,
    partialFilterExpression: { legacyClienteId: { $type: "number" } },
    name: "legacy_cliente",
  }
);

const LocacaoModel = mongoose.model("locacao", LocacaoSchema);
export default LocacaoModel;
