
import bcrypt from 'bcrypt';
import UsersModel from "../models/users.js";
import { generateAuthToken } from "../helpers/token.js";

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
    try{
      const user = await UsersModel.findOne({ userEmail }).select('+userPass'); 
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

      /*
       * Expira o teste grátis "de forma preguiçosa": em vez de um job
       * rodando em background, checa no momento do login (mesmo padrão
       * já usado pra checagem de pagamento no frontend).
       */
      if (
        user.accountStatus === "trial" &&
        user.trialEndsAt &&
        user.trialEndsAt < new Date()
      ) {
        user.accountStatus = "pending_payment";
        user.userActive = false;

        await UsersModel.updateOne(
          { userId: user.userId },
          { $set: { accountStatus: "pending_payment", userActive: false } }
        );
      }
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
      if (userResponse.notificationsEnabled === undefined) {
        userResponse.notificationsEnabled = true; // Valor padrão
      }
      
      res.send({
          user: userResponse,
          token: generateAuthToken(userResponse),
      });
    }catch (err) {
        res.status(500).json(err);
        return res
    }   
} 
  
  
