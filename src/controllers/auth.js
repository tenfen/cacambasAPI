
import bcrypt from 'bcrypt';
import UsersModel from "../models/users.js";
import { generateAuthToken } from "../helpers/token.js";
import { refreshAccountStatus } from "../services/accountAccessService.js";

export function signIn(req, res) {
    return res.status(200).send(req.decoded);
}

export function signOut(req, res) {
    return res.status(200).send(req.decoded);
}

export function refreshToken(req, res) {
    return res.status(200).send(req.decoded);
}

export async function autenthicate(req, res) {
    const {userEmail, userPass} = req.body;
    if (typeof userEmail !== "string" || typeof userPass !== "string") {
      return res.status(400).send({ error: "Email e senha são obrigatórios." });
    }

    try{
      let user = await UsersModel.findOne({ userEmail }).select('+userPass'); 
      if(!user)
      return res.status(400).send({error: 'Usuário não encontrado!'});

      const senhaCriptografada = user.userPass.startsWith("$2b$");
    
      let senhaValida = false;

      if (senhaCriptografada) {
        // Tenta com bcrypt
        senhaValida = await bcrypt.compare(userPass, user.userPass);
      } else {
        // Senha antiga em texto plano
        senhaValida = userPass === user.userPass;
      }
      if (!senhaValida) {
        return res.status(400).send({ error: 'Senha inválida!' });
      }

      // Aplica o vencimento do teste grátis ou do mês pago.
      user = await refreshAccountStatus(user);

      // Se a senha era texto plano, atualiza com hash bcrypt
      if (!senhaCriptografada) {
        const hashedPassword = await bcrypt.hash(userPass, 10);
        user.userPass = hashedPassword;
        // Atualiza só o campo userPass no banco
        await UsersModel.updateOne(
          { userId: user.userId }, // filtro seguro
          { $set: { userPass: user.userPass } }
        );

      }
      user.userPass = undefined;
      
      // Garantir que notificationsEnabled seja retornado
      const userResponse = user.toObject();
      delete userResponse.twoFactorCode;
      delete userResponse.twoFactorCodeExpires;
      if (userResponse.notificationsEnabled === undefined) {
        userResponse.notificationsEnabled = true; // Valor padrão
      }
      
      res.send({
          user: userResponse,
          token: generateAuthToken(userResponse),
      });
    }catch (err) {
        console.error("Erro ao autenticar usuário:", err);
        return res.status(500).send({ error: "Erro interno do servidor." });
    }
}
  
  
