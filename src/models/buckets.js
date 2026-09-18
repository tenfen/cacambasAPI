import mongoose from "mongoose";

const Schema = mongoose.Schema;

const BucketSchema = new Schema(
  {
    bucketId: { type: Number, required: true, unique: true },

    /**
     * Dono do cadastro (userId do proprietário do negócio).
     */
    userId: { type: Number, required: true },

    bucketName: { type: String, required: true },

    /**
     * Identificação/número da caçamba (ex: pintado no equipamento).
     */
    bucketNumber: { type: String, required: false, default: null },

    /**
     * Tamanho em metros cúbicos.
     */
    bucketSize: { type: Number, required: false, default: null },

    bucketStatus: {
      type: String,
      enum: ["disponivel", "alugada", "manutencao"],
      default: "disponivel",
    },

    /**
     * Valor fechado da locação dessa caçamba (não é por dia).
     */
    bucketRentalValue: { type: Number, required: false, default: null },

    bucketNotes: { type: String, required: false, default: null },

    bucketActive: { type: Boolean, required: true, default: true },
    createdAt: { type: Date, default: Date.now },
    updateAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "buckets",
  }
);

const BucketModel = mongoose.model("bucket", BucketSchema);
export default BucketModel;
