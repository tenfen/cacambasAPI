import mongoose from "mongoose";

const Schema = mongoose.Schema;

const BucketSchema = new Schema(
  {
    bucketId: { type: Number, required: true, unique: true },
    bucketName: { type: String, required: true },
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
