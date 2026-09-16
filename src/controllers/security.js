import UserModel from "../models/users.js";
import bcrypt from 'bcrypt';
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY não foi configurado no arquivo .env");
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function generateTwoFactorCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function toggle2FA(req, res) {
  const { userId } = req.params;
  const { enable } = req.body;

  try {
    const user = await UserModel.findOne({ userId: parseInt(userId) });
    
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    user.twoFactorEnabled = enable;
    
    if (!enable) {
      user.twoFactorCode = null;
      user.twoFactorCodeExpires = null;
    }

    await UserModel.updateOne(
      { userId: user.userId },
      { 
        $set: { 
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorCode: user.twoFactorCode,
          twoFactorCodeExpires: user.twoFactorCodeExpires
        } 
      }
    );

    return res.status(200).json({ 
      status: 200,
      message: enable ? "2FA ativado com sucesso!" : "2FA desativado com sucesso!",
      content: { twoFactorEnabled: user.twoFactorEnabled }
    });
  } catch (error) {
    console.error("Erro ao atualizar 2FA:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
}

export async function send2FACode(req, res) {
  const { userEmail } = req.body;

  if (!userEmail) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }

  try {
    const user = await UserModel.findOne({ userEmail });
    
    if (!user) {
      return res.status(200).json({ message: 'Se o email estiver cadastrado, você receberá o código.' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA não está ativado para este usuário.' });
    }

    if (!resend) {
      return res.status(500).json({ error: 'Serviço de e-mail não configurado.' });
    }

    const code = generateTwoFactorCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await UserModel.updateOne(
      { userId: user.userId },
      { 
        $set: { 
          twoFactorCode: code,
          twoFactorCodeExpires: expiresAt
        } 
      }
    );

    try {
      const { data, error } = await resend.emails.send({
        from: 'Cacambas <onboarding@icellfipe.com.br>',
        to: [userEmail],
        subject: 'Código de Verificação - Cacambas',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6024C1;">Código de Verificação</h2>
            <p>Olá, ${user.nm_user}!</p>
            <p>Seu código de verificação de 2 fatores é:</p>
            
            <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #6024C1; font-size: 36px; margin: 0; letter-spacing: 8px;">${code}</h1>
            </div>
            
            <p style="color: #666;">Este código expira em <strong>5 minutos</strong>.</p>
            <p style="color: #666; font-size: 12px;">Se você não solicitou este código, ignore este email.</p>
          </div>
        `,
      });

      if (error) {
        console.error('Erro ao enviar email com Resend:', error);
        return res.status(500).json({ error: 'Falha ao enviar o código.' });
      }

      return res.status(200).json({ 
        message: 'Código enviado com sucesso!',
        expiresAt: expiresAt
      });

    } catch (resendError) {
      console.error('Erro ao chamar a API do Resend:', resendError);
      return res.status(500).json({ error: 'Erro ao conectar com o serviço de e-mail.' });
    }
  } catch (error) {
    console.error('Erro ao enviar código 2FA:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function verify2FACode(req, res) {
  const { userEmail, code } = req.body;

  if (!userEmail || !code) {
    return res.status(400).json({ error: 'Email e código são obrigatórios.' });
  }

  try {
    const user = await UserModel.findOne({ userEmail });
    
    if (!user) {
      return res.status(401).json({ error: 'Código inválido ou expirado.' });
    }

    if (!user.twoFactorCode || !user.twoFactorCodeExpires) {
      return res.status(401).json({ error: 'Nenhum código foi solicitado.' });
    }

    if (new Date() > user.twoFactorCodeExpires) {
      return res.status(401).json({ error: 'Código expirado. Solicite um novo.' });
    }

    if (user.twoFactorCode !== code) {
      return res.status(401).json({ error: 'Código incorreto.' });
    }

    await UserModel.updateOne(
      { userId: user.userId },
      { 
        $set: { 
          twoFactorCode: null,
          twoFactorCodeExpires: null
        } 
      }
    );

    return res.status(200).json({ 
      status: 200,
      message: 'Código verificado com sucesso!',
      content: {
        userId: user.userId,
        userName: user.userName,
        userEmail: user.userEmail,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Erro ao verificar código 2FA:', error);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}

export async function changePassword(req, res) {
  const { userId } = req.params;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'As senhas não coincidem.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const user = await UserModel.findOne({ userId: parseInt(userId) });
    
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.userPass);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await UserModel.updateOne(
      { userId: user.userId },
      { $set: { userPass: hashedNewPassword } }
    );

    return res.status(200).json({ 
      status: 200,
      message: 'Senha alterada com sucesso!'
    });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
}
