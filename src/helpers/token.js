import jwt from "jsonwebtoken";

export const SESSION_PURPOSE = "session";
export const PASSWORD_RESET_PURPOSE = "password-reset";

/**
 * Token de sessão (login). Carrega o userId numérico — usado pelo
 * middleware de autenticação para checar dono/admin nas rotas.
 */
export function generateAuthToken(user) {
  return jwt.sign(
    {
      purpose: SESSION_PURPOSE,
      userId: user.userId,
      userRole: user.userRole,
      userEmail: user.userEmail,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}
