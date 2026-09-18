import jwt from "jsonwebtoken";

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

    const resourceUserId = getResourceUserId(req);

    if (
      resourceUserId === undefined ||
      resourceUserId === null ||
      Number(resourceUserId) !== Number(req.auth.userId)
    ) {
      return res
        .status(403)
        .send({ error: "Você não tem permissão para acessar este recurso." });
    }

    return next();
  };
}
