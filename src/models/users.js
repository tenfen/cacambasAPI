import mongoose from "mongoose";

// import autoIncrement from "mongoose-auto-increment";

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
    },

    userName: {
      type: String,
      required: true,
    },

    userLastname: {
      type: String,
      required: true,
    },

    /**
     * Controle geral de acesso ao sistema.
     *
     * false enquanto o usuário ainda não pagou
     * true depois que o pagamento for aprovado
     */
    userActive: {
      type: Boolean,
      required: false,
      default: false,
    },

    userPass: {
      type: String,
      required: true,
    },

    userPhone: {
      type: Number,
      required: true,
    },

    userEmail: {
      type: String,
      required: true,
      unique: true,
    },

    userRole: {
      type: String,
      required: true,
    },

    userAddressId: {
      type: Number,
      required: false,
      default: null,
    },

    notificationsEnabled: {
      type: Boolean,
      required: false,
      default: true,
    },

    pushToken: {
      type: String,
      required: false,
      default: null,
    },

    twoFactorEnabled: {
      type: Boolean,
      required: false,
      default: false,
    },

    twoFactorCode: {
      type: String,
      required: false,
      default: null,
    },

    twoFactorCodeExpires: {
      type: Date,
      required: false,
      default: null,
    },

    /**
     * Campos antigos de assinatura.
     * Mantidos para não quebrar funcionalidades
     * que eventualmente já utilizem esses dados.
     */
    isPremium: {
      type: Boolean,
      required: false,
      default: false,
    },

    subscriptionId: {
      type: String,
      required: false,
      default: null,
    },

    subscriptionPlatform: {
      type: String,
      required: false,
      default: null,
    },

    subscriptionProductId: {
      type: String,
      required: false,
      default: null,
    },

    subscriptionPurchaseToken: {
      type: String,
      required: false,
      default: null,
    },

    subscriptionStartDate: {
      type: Date,
      required: false,
      default: null,
    },

    subscriptionEndDate: {
      type: Date,
      required: false,
      default: null,
    },

    subscriptionAutoRenew: {
      type: Boolean,
      required: false,
      default: true,
    },

    subscriptionCancelledAt: {
      type: Date,
      required: false,
      default: null,
    },

    /**
     * ==========================================
     * CONTROLE DA CONTA E DO PAGAMENTO
     * ==========================================
     */

    /**
     * Situação geral da conta.
     *
     * pending_payment = cadastro realizado,
     * mas pagamento ainda não aprovado
     *
     * active = conta liberada
     *
     * suspended = conta suspensa
     *
     * cancelled = conta cancelada
     */
    accountStatus: {
      type: String,
      enum: [
        "pending_payment",
        "active",
        "suspended",
        "cancelled",
      ],
      default: "pending_payment",
    },

    /**
     * Empresa responsável pelo pagamento.
     */
    billingProvider: {
      type: String,
      enum: [
        "mercadopago",
        "stripe",
        "manual",
        null,
      ],
      default: null,
    },

    /**
     * Identificador do cliente no provedor de pagamento.
     * No Checkout Pro do Mercado Pago pode permanecer null,
     * pois inicialmente trabalharemos com uma preferência
     * e pagamentos vinculados ao usuário.
     */
    billingCustomerId: {
      type: String,
      default: null,
    },

    /**
     * Identificador da assinatura no provedor.
     *
     * Para o fluxo inicial com Checkout Pro,
     * pode permanecer null.
     */
    billingSubscriptionId: {
      type: String,
      default: null,
    },

    /**
     * Situação da assinatura/pagamento recorrente.
     */
    subscriptionStatus: {
      type: String,
      enum: [
        "pending",
        "active",
        "paused",
        "cancelled",
        "expired",
        "overdue",
        "rejected",
      ],
      default: "pending",
    },

    /**
     * Início do período atualmente contratado.
     */
    currentPeriodStart: {
      type: Date,
      default: null,
    },

    /**
     * Fim do período atualmente contratado.
     */
    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    /**
     * ID do último pagamento registrado no sistema.
     * Aqui será salvo o _id do documento Payment.
     */
    lastPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "payment",
      default: null,
    },

    /**
     * Status do último pagamento recebido.
     */
    lastPaymentStatus: {
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
      default: null,
    },

    /**
     * ==========================================
     * CONTROLE DE DATAS
     * ==========================================
     */

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updateAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "users",
  }
);

const UserModel = mongoose.model("user", UserSchema);

export default UserModel;