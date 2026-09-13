import mongoose from "mongoose";

const Schema = mongoose.Schema;

const DeviceSchema = new Schema(
  {
    deviceId: { type: Number, required: true, unique: true },
    deviceTitle: { type: String, required: true },
    deviceDescription: { type: String, required: false },
    deviceVersion: { type: String, required: false },
    deviceYear: { type: String, required: true },
    deviceActive: { type: Boolean, required: true, default: false },
    deviceBroadband: { type: String, required: false },
    deviceImage: { type: String, required: false },
    deviceBrand: { type: String, required: true },
    deviceMemory: { type: String, required: true },
    deviceStorage: { type: String, required: true },
    deviceProcessor: { type: String, required: false },
    devicePrice: { type: Object, required: true },
    deviceUserId: { type: Number, default: null },
    assistenciaId: { type: Number, default: null }, // ID da assistência dona do device
    createdAt: { type: Date, default: Date.now },
    updateAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "devices",
  }
);

const DeviceModel = mongoose.model("device", DeviceSchema);
export default DeviceModel;
