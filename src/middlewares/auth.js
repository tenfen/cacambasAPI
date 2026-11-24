import jwt from "jsonwebtoken";
import { parseId } from "../helpers/ownership.js";
import { SESSION_PURPOSE } from "../helpers/token.js";
import UserModel from "../models/users.js";
import { refreshAccountStatus } from "../services/accountAccessService.js";

const ADMIN_ROLES = ["admin", "superadmin"];

/**
 * Exige um Bearer token válido. Preenche req.auth com os dados do
 * usuário autenticado (userId numérico, userRole, userEmail).
 */
export function authenticate(req, res, next) {
  const authorization = req.headers["authorization"] || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).send({ error: "Token não informado." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Token de redefinição de senha não vale como sessão. Sessões emitidas
    // antes deste campo existir não têm "purpose", mas sempre têm userRole.
    const isSession = decoded.purpose
      ? decoded.purpose === SESSION_PURPOSE
      : Boolean(decoded.userRole);

    if (!isSession) {
      return res.status(401).send({ error: "Token inválido ou expirado." });
    }

    req.auth = {
      userId: decoded.userId,
      userRole: decoded.userRole,
      userEmail: decoded.userEmail,
    };

    return next();
  } catch (err) {
    return res.status(401).send({ error: "Token inválido ou expirado." });
  }
}

/**
 * Deve rodar depois de `authenticate`. Só libera contas em teste grátis
 * ou com o mês pago; admin passa direto. Responde 402 quando falta pagar.
 */
export async function requireActiveAccount(req, res, next) {
  if (ADMIN_ROLES.includes(req.auth.userRole)) {
    return next();
  }

  const user = await UserModel.findOne({ userId: Number(req.auth.userId) });

  if (!user) {
    return res.status(401).send({ error: "Usuário não encontrado." });
  }

  const { accountStatus } = await refreshAccountStatus(user);

  if (!["active", "trial"].includes(accountStatus)) {
    return res.status(402).send({
      error: "Conta sem acesso ativo.",
      message: "Sua conta não está ativa. Conclua o pagamento para continuar.",
    });
  }

  return next();
}

/**
 * Deve rodar depois de `authenticate`. Só libera contas admin/superadmin.
 */
export function requireAdmin(req, res, next) {
  if (!req.auth || !ADMIN_ROLES.includes(req.auth.userRole)) {
    return res.status(403).send({ error: "Acesso restrito a administradores." });
  }

  return next();
}

/**
 * Deve rodar depois de `authenticate`. Libera se o usuário autenticado
 * é o dono do recurso (userId da rota/corpo bate com o do token) ou
 * se é admin/superadmin. `getResourceUserId` recebe o `req` e devolve
 * o userId do recurso sendo acessado.
 */
export function requireSelfOrAdmin(getResourceUserId) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).send({ error: "Não autenticado." });
    }

    if (ADMIN_ROLES.includes(req.auth.userRole)) {
      return next();
    }

    const resourceUserId = parseId(getResourceUserId(req));

    if (
      resourceUserId === null ||
      resourceUserId !== Number(req.auth.userId)
    ) {
      return res
        .status(403)
        .send({ error: "Você não tem permissão para acessar este recurso." });
    }

    return next();
  };
}
