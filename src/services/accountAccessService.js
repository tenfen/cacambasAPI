import UserModel from "../models/users.js";
import { BILLING_CONFIG } from "../config/billing.js";

const MAX_TENTATIVAS = 5;

/**
 * Soma meses sem estourar o fim do mês (31/01 + 1 mês = 28 ou 29/02).
 */
export function addMonths(date, months) {
  const result = new Date(date);
  const day = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDay));

  return result;
}

/** Último instante de acesso do mês pago, já com a tolerância. */
export function getGraceEnd(currentPeriodEnd) {
  if (!currentPeriodEnd) return null;

  const days = BILLING_CONFIG.plan.graceDays;
  return new Date(new Date(currentPeriodEnd).getTime() + days * 24 * 60 * 60 * 1000);
}

function isPast(date, now = new Date()) {
  return Boolean(date) && new Date(date) <= now;
}

/**
 * Aplica o vencimento do teste grátis ou do mês pago e devolve o usuário
 * atualizado. Conta ativa sem currentPeriodEnd foi liberada manualmente
 * pelo admin e não vence.
 */
export async function refreshAccountStatus(user) {
  const now = new Date();

  const testeVencido =
    user.accountStatus === "trial" && isPast(user.trialEndsAt, now);
  const periodoVencido =
    user.accountStatus === "active" && isPast(getGraceEnd(user.currentPeriodEnd), now);

  if (!testeVencido && !periodoVencido) return user;

  const changes = { accountStatus: "pending_payment", userActive: false };
  const unchanged = { userId: user.userId, accountStatus: user.accountStatus };

  // Só altera se nenhum pagamento mudou a data nesse meio-tempo.
  if (testeVencido) {
    unchanged.trialEndsAt = user.trialEndsAt;
  } else {
    unchanged.currentPeriodEnd = user.currentPeriodEnd;
    changes.subscriptionStatus = "expired";
  }

  await UserModel.updateOne(unchanged, { $set: changes });

  return (await UserModel.findOne({ userId: user.userId })) || user;
}

/**
 * Pagamentos processados antes de existir appliedPaymentIds: o usuário só
 * guarda o último, em lastPaymentId.
 */
function aplicadoNoFormatoAntigo(user, payment, providerPaymentId) {
  return (
    !user.appliedPaymentIds?.length &&
    user.lastPaymentStatus === "approved" &&
    String(user.lastPaymentId) === String(payment._id) &&
    payment.providerPaymentId === providerPaymentId
  );
}

/**
 * Libera um mês para o pagamento aprovado, uma única vez por pagamento do
 * Mercado Pago, mesmo com notificações repetidas ou simultâneas.
 */
export async function applyApprovedPayment(payment, providerPaymentId) {
  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    const user = await UserModel.findOne({ userId: payment.userId });

    if (!user) return false;
    if (user.appliedPaymentIds?.includes(providerPaymentId)) return false;
    if (aplicadoNoFormatoAntigo(user, payment, providerPaymentId)) return false;

    const now = new Date();

    // Renovação antecipada ou dentro da tolerância soma a partir do
    // vencimento existente; depois disso, conta a partir de hoje.
    const limite =
      user.accountStatus === "active"
        ? getGraceEnd(user.currentPeriodEnd)
        : user.currentPeriodEnd;
    const base =
      user.currentPeriodEnd && !isPast(limite, now)
        ? user.currentPeriodEnd
        : now;

    const result = await UserModel.updateOne(
      {
        userId: user.userId,
        currentPeriodEnd: user.currentPeriodEnd ?? null,
        appliedPaymentIds: { $ne: providerPaymentId },
      },
      {
        $set: {
          userActive: true,
          accountStatus: "active",
          subscriptionStatus: "active",
          billingProvider: "mercadopago",
          currentPeriodStart: now,
          currentPeriodEnd: addMonths(base, 1),
          lastPaymentId: payment._id,
          lastPaymentStatus: "approved",
        },
        $push: { appliedPaymentIds: providerPaymentId },
      }
    );

    if (result.modifiedCount === 1) return true;
  }

  throw new Error("Não foi possível aplicar o pagamento: conflito de atualização.");
}

/**
 * Estorno ou contestação: retira o mês que esse pagamento havia liberado.
 * Pagamento que nunca liberou acesso não altera a conta.
 */
export async function revertPayment(payment, providerPaymentId, status) {
  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    const user = await UserModel.findOne({ userId: payment.userId });

    if (!user) return false;

    const registrado = user.appliedPaymentIds?.includes(providerPaymentId);
    const antigo = aplicadoNoFormatoAntigo(user, payment, providerPaymentId);

    if (!registrado && !antigo) return false;

    const now = new Date();
    const periodEnd = user.currentPeriodEnd
      ? addMonths(user.currentPeriodEnd, -1)
      : null;

    const changes = { currentPeriodEnd: periodEnd };

    if (String(user.lastPaymentId) === String(payment._id)) {
      changes.lastPaymentStatus = status;
    }

    // Suspensão feita pelo admin continua valendo. Estorno não tem tolerância.
    if (user.accountStatus === "active" && isPast(periodEnd, now)) {
      changes.accountStatus = "pending_payment";
      changes.subscriptionStatus = "overdue";
      changes.userActive = false;
    }

    const filter = {
      userId: user.userId,
      accountStatus: user.accountStatus,
      currentPeriodEnd: user.currentPeriodEnd ?? null,
    };

    if (registrado) filter.appliedPaymentIds = providerPaymentId;
    else filter.lastPaymentStatus = "approved";

    const result = await UserModel.updateOne(filter, {
      $set: changes,
      $pull: { appliedPaymentIds: providerPaymentId },
    });

    if (result.modifiedCount === 1) return true;
  }

  throw new Error("Não foi possível estornar o pagamento: conflito de atualização.");
}
