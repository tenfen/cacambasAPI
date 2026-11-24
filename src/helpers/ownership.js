const ADMIN_ROLES = ["admin", "superadmin"];

export function isAdmin(req) {
  return ADMIN_ROLES.includes(req.auth?.userRole);
}

/**
 * Converte um id para inteiro só se for composto apenas por dígitos.
 * Number() e parseInt() divergem em valores como "1e1" (10 x 1), o que
 * permitiria passar na verificação de dono e consultar outro registro.
 */
export function parseId(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;

  const text = String(value);
  return /^\d{1,15}$/.test(text) ? Number(text) : null;
}

/**
 * Filtro que limita a consulta aos registros do usuário do token.
 * Admin enxerga todos. O userId enviado pelo cliente nunca é usado aqui.
 */
export function ownerFilter(req) {
  return isAdmin(req) ? {} : { userId: Number(req.auth.userId) };
}

/**
 * Dono de um registro novo: sempre o usuário do token; só admin pode
 * cadastrar em nome de outro usuário.
 */
export function ownerIdForCreate(req) {
  if (isAdmin(req)) {
    const informado = parseId(req.body?.userId);
    if (informado !== null) return informado;
  }

  return Number(req.auth.userId);
}

/**
 * Copia apenas os campos permitidos. Impede trocar o dono/id do registro
 * e injetar operadores do MongoDB (ex: "$set") pelo corpo da requisição.
 */
export function pick(source, fields) {
  const result = {};

  for (const field of fields) {
    if (source && Object.hasOwn(source, field) && source[field] !== undefined) {
      result[field] = source[field];
    }
  }

  return result;
}
