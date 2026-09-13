
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UsersModel from "../models/users.js";
import authConfig from "../config/auth.json" assert { type: "json" };

export function signIn(req, res) {
    return res.status(200).send(req.decoded);
}

export function signOut(req, res) {
    return res.status(200).send(req.decoded);
}

export function refreshToken(req, res) {
    return res.status(200).send(req.decoded);
}

function generateToken(params = {}){
    return jwt.sign(params, authConfig.secret, {
        expiresIn: 86400,
    });
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
          token: generateToken({id: user.id, userRole: user.userRole}),
      });
    }catch (err) {
        res.status(500).json(err);
        return res
    }   
} 
  
  
