import crypto from "crypto";
import mongoose from "mongoose";

import UserModel from "../models/users.js";
import PaymentModel from "../models/paymentModel.js";

import {
  createPaymentPreference,
  getMercadoPagoPayment,
} from "../services/mercadoPagoService.js";

import { BILLING_CONFIG } from "../config/billing.js";

function safeEqual(valueA, valueB) {
  if (!valueA || !valueB) {
    return false;
  }

  const bufferA = Buffer.from(valueA);
  const bufferB = Buffer.from(valueB);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

function parseSignatureHeader(signatureHeader) {
  if (!signatureHeader) {
    return {};
  }

  return signatureHeader.split(",").reduce((result, item) => {
    const [key, value] = item.split("=");

    if (key && value) {
      result[key.trim()] = value.trim();
    }

    return result;
  }, {});
}

function validateMercadoPagoWebhook(req) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  // Durante o desenvolvimento, caso a chave ainda não tenha
  // sido configurada, não bloqueia o webhook.
  if (!secret) {
    console.warn(
      "MERCADOPAGO_WEBHOOK_SECRET não configurado. Validação ignorada em desenvolvimento."
    );

    return true;
  }

  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];

  if (!xSignature || !xRequestId) {
    return false;
  }

  const signature = parseSignatureHeader(xSignature);

  const timestamp = signature.ts;
  const receivedHash = signature.v1;

  const dataId =
    req.body?.data?.id ||
    req.query?.["data.id"] ||
    req.query?.id;

  if (!timestamp || !receivedHash || !dataId) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${timestamp};`;

  const calculatedHash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return safeEqual(calculatedHash, receivedHash);
}

export async function createCheckout(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Usuário não informado.",
      });
    }

    const user = await UserModel.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado.",
      });
    }

    /*
     * Usuário já ativo pode criar um novo checkout para renovar
     * antecipadamente (ex: assinatura vence amanhã e ele já quer pagar).
     * Por isso não bloqueamos aqui — só não rebaixamos o status dele
     * mais abaixo enquanto o pagamento está só "pendente", pra não
     * cortar o acesso de quem ainda está dentro do período pago.
     */
    const jaEstavaAtivo = user.accountStatus === "active";

    const paymentId = new mongoose.Types.ObjectId();

    const payment = await PaymentModel.create({
      _id: paymentId,
      userId: user.userId,
      provider: "mercadopago",
      planId: BILLING_CONFIG.plan.id,
      amount: BILLING_CONFIG.plan.amount,
      currency: BILLING_CONFIG.plan.currency,
      status: "pending",
      externalReference: String(paymentId),
    });

    const preference = await createPaymentPreference({
      user,
      paymentId: payment._id,
    });

    payment.providerPreferenceId = preference.id;
    payment.checkoutUrl =
      preference.init_point || preference.sandbox_init_point;

    await payment.save();

    if (!jaEstavaAtivo) {
      await UserModel.updateOne(
        { userId: user.userId },
        {
          $set: {
            accountStatus: "pending_payment",
            subscriptionStatus: "pending",
            billingProvider: "mercadopago",
          },
        }
      );
    }

    return res.status(201).json({
      success: true,
      paymentId: payment._id,
      preferenceId: preference.id,
      checkoutUrl: payment.checkoutUrl,
      status: payment.status,
    });
  } catch (error) {
    console.error("Erro ao criar checkout Mercado Pago:", error);

    return res.status(500).json({
      success: false,
      message: "Não foi possível criar o checkout.",
    });
  }
}

export async function getPaymentStatus(req, res) {
  try {
    const { userId } = req.params;

    const payment = await PaymentModel.findOne({ userId })
      .sort({ createdAt: -1 });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Nenhum pagamento encontrado.",
      });
    }

    return res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Erro ao consultar pagamento:", error);

    return res.status(500).json({
      success: false,
      message: "Erro ao consultar pagamento.",
    });
  }
}

export async function mercadoPagoWebhook(req, res) {
  try {
    const isValid = validateMercadoPagoWebhook(req);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Webhook inválido.",
      });
    }

    const notificationType = req.body?.type;
    const paymentId =
      req.body?.data?.id ||
      req.query?.["data.id"] ||
      req.query?.id;

    if (notificationType !== "payment" || !paymentId) {
      return res.status(200).json({
        success: true,
        message: "Notificação recebida.",
      });
    }

    const mercadoPagoPayment = await getMercadoPagoPayment(paymentId);

    const externalReference =
      mercadoPagoPayment.external_reference;

    if (!externalReference) {
      return res.status(200).json({
        success: true,
        message: "Pagamento sem referência externa.",
      });
    }

    const payment = await PaymentModel.findOne({
      externalReference: String(externalReference),
    });

    if (!payment) {
      return res.status(200).json({
        success: true,
        message: "Pagamento não localizado.",
      });
    }

    payment.providerPaymentId = String(mercadoPagoPayment.id);
    payment.status = mercadoPagoPayment.status;
    payment.statusDetail =
      mercadoPagoPayment.status_detail || null;
    payment.paymentMethod =
      mercadoPagoPayment.payment_method_id || null;
    payment.rawPaymentData = mercadoPagoPayment;
    payment.rawWebhookData = req.body;

    if (mercadoPagoPayment.status === "approved") {
      payment.paidAt = new Date();
    }

    await payment.save();

    const user = await UserModel.findOne({
      userId: payment.userId,
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Pagamento processado, usuário não encontrado.",
      });
    }

    if (mercadoPagoPayment.status === "approved") {
      const now = new Date();

      /*
       * Renovação antecipada: se o período atual ainda não venceu,
       * soma o novo mês a partir do vencimento existente em vez de
       * a partir de hoje, para não descartar os dias que já foram pagos.
       */
      const periodoAtualAindaValido =
        user.currentPeriodEnd && new Date(user.currentPeriodEnd) > now;

      const periodStart = now;
      const periodEnd = new Date(
        periodoAtualAindaValido ? user.currentPeriodEnd : now
      );

      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await UserModel.updateOne(
        { userId: payment.userId },
        {
          $set: {
            userActive: true,
            accountStatus: "active",
            subscriptionStatus: "active",
            billingProvider: "mercadopago",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            lastPaymentId: String(mercadoPagoPayment.id),
            lastPaymentStatus: "approved",
          },
        }
      );
    }

    if (
      ["rejected", "cancelled", "refunded", "charged_back"].includes(
        mercadoPagoPayment.status
      )
    ) {
      await UserModel.updateOne(
        { userId: payment.userId },
        {
          $set: {
            userActive: false,
            accountStatus: "suspended",
            subscriptionStatus: "overdue",
            lastPaymentId: String(mercadoPagoPayment.id),
            lastPaymentStatus: mercadoPagoPayment.status,
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processado.",
    });
  } catch (error) {
    console.error("Erro ao processar webhook Mercado Pago:", error);

    return res.status(500).json({
      success: false,
      message: "Erro ao processar webhook.",
    });
  }
}