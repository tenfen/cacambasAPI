const monthlyAmount = Number(
  process.env.BILLING_MONTHLY_AMOUNT || 89.9
);

export const BILLING_CONFIG = {
  provider: "mercadopago",

  plan: {
    id: "professional",
    name: process.env.BILLING_PLAN_NAME || "Plano Profissional",
    amount: monthlyAmount,
    currency: "BRL",
    frequency: 1,
    frequencyType: "months",
  },

  paymentMethods: {
    pix: true,
    debitCard: true,
    creditCard: true,
  },
};