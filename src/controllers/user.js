//import { getID } from "../helpers/database.js";
import { Resend } from 'resend';
import UserModel from "../models/users.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; // Para gerar e verificar tokens seguros
import app from 'default-api-response-node';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;


export async function getAllUsers(req, res) {
  const { userName, userLastname } =
    req.query;

  let filter = {};

  if (userName) filter = { ...filter, userName };
  if (userLastname) filter = { ...filter, userLastname };

  console.log("FILTER Users", filter);

  const users = await UserModel.find(filter).select('-userPass');

  if (!users) {
    return res.error("Erro ao consultar os usuários");
  }

  return res.success("Usuários consultados com sucesso!", users);
}


//Consultar usuário pelo ID

export async function getUserById(req, res) {
  const userId = req.params.userId;

  try {
    const user = await UserModel.findOne({ userId: parseInt(userId) }).select('-userPass');

    if (!user) {
      return res.badRequest("Usuário não encontrado");
    }

    return res.success("Usuário consultado com sucesso!", user);
  } catch (err) {
    return res.status(500).json(err);
  }
}

//Criar usuário Novo
export async function createUser(req, res) {
    const { userEmail, userPass } = req.body;

    // Endpoint POST /api/user
    try{
      const validaUser = await UserModel.findOne({userEmail});
      if(validaUser){
        return res.status(400).send({error:"Usuário já cadastrado!"});
      } else {

        // Getting the last userId
        const getLastUser = await UserModel.findOne({}).sort({userId: -1}).limit(1)
        const userId = getLastUser ? getLastUser.userId + 1 : 1;

        // Criptografa a senha
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userPass, saltRounds);

        const user = new UserModel({
          userId,
          ...req.body,
          userPass: hashedPassword // substitui a senha original
        })
        user.save();
        const { userPass: _, ...userData } = user.toObject();
        return res.send({user: userData})
  
      }
    }
    catch{
      return res.status(400).send({error:"Erro ao salvar o Usuário"});
    }
      
  }

//update do profile
export async function updateProfile(req, res) {
  const userId = req.body.userId;
  const { userName, userLastname, userPhone, userImage, userEmail, currentPassword } = req.body;
  
  try {
    const currentUser = await UserModel.findOne({ userId: userId }).select('+userPass');
    
    if (!currentUser) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (userEmail && userEmail !== currentUser.userEmail) {
      if (!currentPassword) {
        return res.status(400).json({ 
          message: "Para alterar o email, é necessário informar a senha atual.",
          requirePassword: true 
        });
      }

      const senhaCriptografada = currentUser.userPass.startsWith("$2b$");
      let senhaValida = false;

      if (senhaCriptografada) {
        senhaValida = await bcrypt.compare(currentPassword, currentUser.userPass);
      } else {
        senhaValida = currentPassword === currentUser.userPass;
      }

      if (!senhaValida) {
        return res.status(401).json({ message: "Senha atual incorreta." });
      }

      const emailExists = await UserModel.findOne({ 
        userEmail: userEmail,
        userId: { $ne: userId }
      });

      if (emailExists) {
        return res.status(400).json({ message: "Este email já está em uso por outro usuário." });
      }
    }

    const update = {
      userName,
      userLastname,
      userPhone,
      userImage,
      updateAt: new Date()
    };

    if (userEmail && userEmail !== currentUser.userEmail) {
      update.userEmail = userEmail;
    }

    const updatedProfile = await UserModel.findOneAndUpdate(
      { userId: userId }, 
      update,
      { new: true }
    );

    const userResponse = updatedProfile.toObject();
    delete userResponse.userPass;

    res.status(200).json(userResponse);
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
}

// Atualizar Push Token
export async function updatePushToken(req, res) {
  const { userId } = req.params;
  const { pushToken } = req.body;

  try {
    const user = await UserModel.findOneAndUpdate(
      { userId: parseInt(userId) },
      { pushToken: pushToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`✅ Push token atualizado para usuário ${userId}`);
    return res.status(200).json({ 
      status: 200,
      message: "Push token atualizado com sucesso!",
      content: user 
    });
  } catch (error) {
    console.error("Erro ao atualizar push token:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
}

// Atualizar configurações de notificação
export async function updateNotificationSettings(req, res) {
  const { userId } = req.params;
  const { notificationsEnabled, pushToken } = req.body;

  try {
    console.log(`🔔 Atualizando configurações de notificação para usuário ${userId}`);
    console.log('📥 Dados recebidos:', { 
      notificationsEnabled, 
      pushToken: pushToken === null ? 'NULL' : (pushToken ? 'TOKEN' : 'UNDEFINED')
    });
    console.log('📦 Valor exato de pushToken:', pushToken);

    const updateData = {};
    if (notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = notificationsEnabled;
    }
    // Sempre atualizar pushToken, mesmo se for null (para remover)
    if (pushToken !== undefined) {
      updateData.pushToken = pushToken;
    }

    console.log('💾 Dados que serão salvos no banco:', updateData);

    const user = await UserModel.findOneAndUpdate(
      { userId: parseInt(userId) },
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`✅ Configurações atualizadas:`, {
      userId: user.userId,
      notificationsEnabled: user.notificationsEnabled,
      pushToken: user.pushToken === null ? 'NULL' : (user.pushToken ? 'TOKEN-EXISTE' : 'UNDEFINED')
    });
    console.log('🔍 pushToken no banco agora:', user.pushToken);

    return res.status(200).json({ 
      status: 200,
      message: "Configurações atualizadas com sucesso!",
      content: user 
    });
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
}

  //Recuperação de senha - envio de email
export async function requestPasswordReset(req, res) {

  const {userEmail} = req.body;

  if (!userEmail) {
    return res.status(400).send({ error: 'Email é obrigatório.' });
  }

  try {
    const user = await UserModel.findOne({ userEmail });
    if (!user) {
      // Por segurança, SEMPRE retorne uma mensagem genérica de sucesso,
      // mesmo se o email não for encontrado, para evitar enumeração de usuários.
      console.warn(`Tentativa de solicitação de recuperação de senha para email não existente: ${userEmail}`);
      return res.status(200).send({ message: 'Se o email estiver em nosso sistema, você receberá um link de recuperação de senha.' });
    }

    // Gerar um token JWT único e com expiração curta (ex: 1 hora)
    const token = jwt.sign(
      { userId: user.userId, userEmail: user.userEmail },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expira em 1 hora
    );

    // TODO: (Opcional, mas recomendado) Salvar o token no banco de dados
    // Isso permite invalidar tokens após o uso ou antes da expiração.
    // Ex: await PasswordResetTokenModel.create({ userId: user.userId, token, expiresAt: new Date(Date.now() + 3600000) });

    // Link direto para a página de redefinição de senha do painel web.
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

      try {
        const { data, error } = await resend.emails.send({
            from: 'CaçambaFácil <onboarding@resend.dev>', // Remetente de teste do Resend.
                                                                      // Só entrega para o email cadastrado na conta Resend.
                                                                      // Quando verificar um domínio próprio, troque para
                                                                      // 'CaçambaFácil <onboarding@seudominio.com.br>'.
            to: [userEmail], // O 'to' deve ser um array
            subject: 'Redefinição de Senha - CaçambaFácil',
            html: `
                <p>Olá,</p>
                <p>Você solicitou a redefinição de senha da sua conta CaçambaFácil.</p>
                <p>Para redefinir sua senha, clique no botão abaixo:</p>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: auto;">
                    <tr>
                        <td style="border-radius: 8px; background: #6024C1; text-align: center;">
                            <a href="${resetLink}" target="_blank" style="
                                background: #6024C1;
                                color: #ffffff;
                                font-family: Arial, sans-serif;
                                font-size: 16px;
                                font-weight: bold;
                                line-height: 1.2;
                                padding: 12px 24px;
                                text-decoration: none;
                                display: inline-block;
                                border-radius: 8px;
                                white-space: nowrap;
                            ">
                                Redefinir minha senha
                            </a>
                        </td>
                    </tr>
                </table>

                <p>Se você não solicitou isso, pode ignorar este email.</p>
                <p>Este link expira em 1 hora.</p>
            `,
        });

        if (error) {
            console.error('Erro ao enviar email com Resend:', error);
            return res.status(500).send({ error: 'Falha ao enviar o email de recuperação.' });
        }

        return res.status(200).send({ message: 'Se o email estiver em nosso sistema, você receberá um link de recuperação de senha.' });

    } catch (resendError) {
        console.error('Erro ao chamar a API do Resend:', resendError);
        return res.status(500).send({ error: 'Erro ao conectar com o serviço de e-mail.' });
    }
    // --- FIM DA MUDANÇA ---
  } catch (error) {
    console.error('Erro no servidor ao solicitar link de recuperação:', error);
    return res.status(500).send({ error: 'Erro interno do servidor.' });
  }
}


// --- NOVO MÉTODO: Redefinir a Senha (Chamado pela Página Web) ---
export async function resetPassword(req, res) {
  const { token, newPassword, confirmNewPassword } = req.body;

  if (!token || !newPassword || !confirmNewPassword) {
    return res.status(400).send({ error: 'Token e senhas são obrigatórios.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).send({ error: 'As senhas não coincidem.' });
   
  }

  // TODO: Adicionar validações de força de senha (tamanho mínimo, caracteres especiais, etc.)
  if (newPassword.length < 6) {
      return res.status(400).send({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    // 1. Verificar e decodificar o token JWT
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('Erro ao verificar token JWT:', err.message);
      return res.status(401).send({ error: 'Link de redefinição inválido ou expirado. Tente novamente.' });
    }

    const { userId } = decodedToken;

    // TODO: (Opcional, mas recomendado) Verificar se o token não foi usado/invalidado no banco de dados.
    // Se você tiver uma tabela `password_reset_tokens`, verifique aqui.
    // Ex: const existingToken = await PasswordResetTokenModel.findOne({ token, used: false });
    // if (!existingToken || existingToken.expiresAt < new Date()) { ... return res.status(401) ... }

    // 2. Buscar o usuário pelo userId do token
    const user = await UserModel.findOne({ userId });

    if (!user) {
      return res.status(404).send({ error: 'Usuário não encontrado.' });
    }

    // 3. Hashear a nova senha
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. Atualizar a senha do usuário no banco de dados
    user.userPass = hashedNewPassword;
    await UserModel.updateOne(
          { userId: user.userId }, // filtro seguro
          { $set: { userPass: user.userPass } }
        );

    // TODO: (Opcional, mas recomendado) Marcar o token como usado ou deletá-lo do banco de dados
    // Ex: await PasswordResetTokenModel.updateOne({ token }, { used: true });

    return res.status(200).send({ message: 'Senha redefinida com sucesso!' });

  } catch (error) {
    console.error('Erro no servidor ao redefinir senha:', error);
    return res.status(500).send({ error: 'Erro interno do servidor.' });
  }
}

/*
//TODO, aqui deve usar pra fazer de fato o envio do link pra redefinir a senha
//npx uri-scheme open exp://192.168.1.3:8081/--/cacambas/reset-password/123 --android
app.get("/app/redirect", async (req, res) => {
  const { path } = req.query
  console.log("REDIRECT", { path })

  const returnUri = `${APP_URI}${path}`
  console.log("REDIRECT", { returnUri })

  // Redirect to the uri
  res.redirect(301, returnUri)
})
  */




/*

export async function createUser(req, res) {
  const user = await UserService.createUser(req.body);

  if (!user) {
    return res.error("Erro ao criar o usuário");
  }

  return res.success("Usuário criado com sucesso!", user);
}

export async function updateUser(req, res) {
  const { userUid } = req.params;

  const userId = await getID("user", "uuid_user", userUid);

  const user = await UserService.updateUser(userId, req.body);

  if (user === false) {
    return res.error("Erro ao atualizar o produto");
  } else if (!user) {
    return res.badRequest("Usuário não encontrado");
  }

  return res.success("Usuário atualizado com sucesso!", user);
}

export async function getUsers(req, res) {
  const users = await UserService.getAllUser();

  if (!users) {
    return res.error("Erro ao consultar os usuários");
  }

  return res.success("Usuários consultados com sucesso!", users);
}

export async function getUserByUid(req, res) {
  const { userUid } = req.params;

  const user = await UserService.getOneUser({ uuid_user: userUid });

  if (user === false) {
    return res.error("Erro ao consultar o usuário");
  } else if (!user) {
    return res.badRequest("Usuário não encontrado");
  }

  return res.success("Usuário consultado com sucesso!", user);
}

export async function deleteUser(req, res) {
  const { userUid } = req.params;

  const user = await UserService.deleteOneUser({ uuid_user: userUid });

  if (user === false) {
    return res.error("Erro ao excluir o usuário");
  } else if (!user) {
    return res.badRequest("Usuário não encontrado");
  }

  return res.success("Usuário excluído com sucesso!");
}
*/
