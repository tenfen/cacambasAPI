import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { BILLING_CONFIG } from "../config/billing.js";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  console.warn(
    "MERCADOPAGO_ACCESS_TOKEN não foi configurado no arquivo .env"
  );
}

const mercadoPagoClient = new MercadoPagoConfig({
  accessToken,
});

const preferenceClient = new Preference(mercadoPagoClient);
const paymentClient = new Payment(mercadoPagoClient);

function isPubliclyReachable(url) {
  return typeof url === "string" && /^https:\/\//i.test(url);
}

export async function createPaymentPreference({
  user,
  paymentId,
  platform,
}) {
  const backendUrl = process.env.BACKEND_URL;
  const appScheme = process.env.APP_SCHEME || "cacambas";
  const frontendUrl = process.env.FRONTEND_URL;

  const preferenceData = {
    items: [
      {
        id: BILLING_CONFIG.plan.id,
        title: BILLING_CONFIG.plan.name,
        description: "Assinatura mensal do sistema de gestão de caçambas",
        quantity: 1,
        currency_id: BILLING_CONFIG.plan.currency,
        unit_price: BILLING_CONFIG.plan.amount,
      },
    ],

    payer: {
      name: user.userName,
      surname: user.userLastname,
      email: user.userEmail,
    },

    external_reference: String(paymentId),

    // Painel web volta pra uma URL https normal; o app mobile volta via
    // deep link, já que um navegador não sabe abrir o esquema cacambas://.
    back_urls:
      platform === "web" && isPubliclyReachable(frontendUrl)
        ? {
            success: `${frontendUrl}/perfil?payment=success`,
            failure: `${frontendUrl}/perfil?payment=failure`,
            pending: `${frontendUrl}/perfil?payment=pending`,
          }
        : {
            success: `${appScheme}://payment/success`,
            failure: `${appScheme}://payment/failure`,
            pending: `${appScheme}://payment/pending`,
          },

    auto_return: "approved",

    statement_descriptor: "CACAMBIX",

    metadata: {
      userId: user.userId,
      paymentId: String(paymentId),
      planId: BILLING_CONFIG.plan.id,
    },

    payment_methods: {
      excluded_payment_types: [],
      installments: 12,
    },
  };

  // O Mercado Pago exige uma URL https publicamente alcançável para o
  // webhook. Em dev, com BACKEND_URL apontando pra um IP local, omitimos
  // o campo em vez de enviar uma URL que a API vai rejeitar.
  if (isPubliclyReachable(backendUrl)) {
    preferenceData.notification_url = `${backendUrl}/v1/payment/webhook`;
  } else {
    console.warn(
      "BACKEND_URL não é uma URL https pública — notification_url do Mercado Pago não será enviado (webhook não vai disparar nesse ambiente)."
    );
  }

  const response = await preferenceClient.create({
    body: preferenceData,
  });

  return response;
}

export async function getMercadoPagoPayment(paymentId) {
  const response = await paymentClient.get({
    id: paymentId,
  });

  return response;
}

export default {
  createPaymentPreference,
  getMercadoPagoPayment,
};