import mongoose from "mongoose";

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["mercadopago"],
      default: "mercadopago",
      required: true,
    },

    providerPreferenceId: {
      type: String,
      default: null,
      index: true,
    },

    providerPaymentId: {
      type: String,
      default: null,
      index: true,
    },

    providerSubscriptionId: {
      type: String,
      default: null,
    },

    externalReference: {
      type: String,
      required: true,
      index: true,
    },

    planId: {
      type: String,
      required: true,
      default: "professional",
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      required: true,
      default: "BRL",
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "authorized",
        "in_process",
        "rejected",
        "cancelled",
        "refunded",
        "charged_back",
        "expired",
      ],
      default: "pending",
      index: true,
    },

    statusDetail: {
      type: String,
      default: null,
    },

    checkoutUrl: {
      type: String,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    rawPaymentData: {
      type: Schema.Types.Mixed,
      default: null,
    },

    rawWebhookData: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    collection: "payments",
    timestamps: true,
  }
);

const PaymentModel = mongoose.model("payment", PaymentSchema);

export default PaymentModel;