import mongoose from "mongoose";
//import autoIncrement from "mongoose-auto-increment";

const Schema = mongoose.Schema;

const AdressSchema = new Schema(
  {
    addressId: { type:Number, required: true, unique: true },
    userId: { type: Number, required: true }, // Vínculo com usuário
    addressName: { type: String, required: true },
    addressNumber: { type: Number, required: false },
    addressCEP: { type: String, required: true },
    addressReference: { type: String, required: false },
    addressComplement: { type: String, required: false },
    addressNeighborhood: { type: String, required: false },
    addressCity: { type: String, required: false},
    addressState: { type: String, required: false},
    addressLatitude: { type: Number, required: false }, // Para geolocalização
    addressLongitude: { type: Number, required: false }, // Para geolocalização
    isDefault: { type: Boolean, default: false }, // Endereço padrão
    createdAt: { type: Date, default: Date.now },
    updateAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null }
  },
  {
    collection: "addresses",
  }
);

/*
adId: { type: Schema.Types.ObjectId, required: true, unique: true },
autoIncrement.initialize(AdSchema);


AdSchema.plugin(autoIncrement.plugin, {
  model: 'ads', field: 'adId',
  startAt: 0,
  incrementBy: 1
})
  */

const AddressModel = mongoose.model("address", AdressSchema);
export default AddressModel;
