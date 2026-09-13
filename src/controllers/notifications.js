import NotificationsModel from "../models/notifications.js";
import UserModel from "../models/users.js";
import { sendPushNotification } from "../services/pushNotificationService.js";

// Criar notificação
export async function createNotification(req, res) {
  try {
    console.log('🔔 ===== CRIAR NOTIFICAÇÃO =====');
    console.log('📥 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const getLastNotification = await NotificationsModel.findOne({}).sort({notificationId: -1}).limit(1);
    const notificationId = getLastNotification ? getLastNotification.notificationId + 1 : 1;

    const notification = new NotificationsModel({
      notificationId,
      ...req.body
    });

    await notification.save();
    console.log('✅ Notificação salva no banco:', notificationId);

    // Se for para todos os usuários, criar cópias para cada um e enviar push
    if (!req.body.userId) {
      console.log('📢 Notificação para TODOS os usuários');
      
      // Primeiro, buscar TODOS os usuários para debug
      const allUsers = await UserModel.find({});
      console.log(`🔍 TOTAL de usuários no banco: ${allUsers.length}`);
      console.log('📊 Breakdown:', {
        total: allUsers.length,
        comDeletedAt: allUsers.filter(u => u.deletedAt).length,
        semDeletedAt: allUsers.filter(u => !u.deletedAt).length,
        notifTrue: allUsers.filter(u => u.notificationsEnabled === true).length,
        notifFalse: allUsers.filter(u => u.notificationsEnabled === false).length,
        notifUndefined: allUsers.filter(u => u.notificationsEnabled === undefined).length,
        comPushToken: allUsers.filter(u => u.pushToken).length,
      });
      
      // Agora buscar usuários ativos
      const users = await UserModel.find({ 
        deletedAt: null,
        notificationsEnabled: { $ne: false }
      });
      
      console.log(`👥 Encontrados ${users.length} usuários ativos com notif habilitadas`);
      if (users.length > 0) {
        console.log('📋 Amostra de usuários:', users.slice(0, 3).map(u => ({
          userId: u.userId,
          userName: u.userName,
          notifEnabled: u.notificationsEnabled,
          pushToken: u.pushToken ? u.pushToken.substring(0, 30) + '...' : 'NÃO'
        })));
      }

      // NÃO criar cópias individuais - a notificação geral já foi salva acima
      console.log('💡 Notificação geral criada - não é necessário criar cópias individuais');

      // Enviar push notification para todos
      const pushTokens = users
        .filter(u => u.pushToken)
        .map(u => u.pushToken);

      console.log(`📱 Usuários com pushToken: ${pushTokens.length}/${users.length}`);
      if (pushTokens.length > 0) {
        console.log('📱 Tokens:', pushTokens);
        console.log(`🚀 Enviando push para ${pushTokens.length} dispositivos`);
        const result = await sendPushNotification(
          pushTokens,
          req.body.title,
          req.body.message,
          { 
            type: req.body.type,
            notificationId: notificationId
          }
        );
        console.log('📤 Resultado do envio:', JSON.stringify(result, null, 2));
      } else {
        console.log('⚠️ Nenhum usuário com pushToken encontrado!');
      }
    } else {
      // Enviar para usuário específico
      console.log(`👤 Notificação para usuário específico: ${req.body.userId}`);
      const user = await UserModel.findOne({ userId: req.body.userId });
      
      if (user) {
        console.log('✅ Usuário encontrado:', user.userId);
        console.log('📱 pushToken:', user.pushToken || 'NENHUM');
        console.log('🔔 notificationsEnabled:', user.notificationsEnabled);
        
        if (user.pushToken && user.notificationsEnabled !== false) {
          console.log(`🚀 Enviando push para usuário ${user.userId}`);
          const result = await sendPushNotification(
            [user.pushToken],
            req.body.title,
            req.body.message,
            { 
              type: req.body.type,
              notificationId: notificationId
            }
          );
          console.log('📤 Resultado do envio:', JSON.stringify(result, null, 2));
        } else {
          console.log('⚠️ Usuário sem pushToken ou notificações desabilitadas');
        }
      } else {
        console.log('❌ Usuário não encontrado!');
      }
    }

    console.log('🎉 ===== NOTIFICAÇÃO CRIADA COM SUCESSO =====\n');
    return res.success("Notificação criada com sucesso!", notification);
  } catch (error) {
    console.error("❌ ===== ERRO AO CRIAR NOTIFICAÇÃO =====");
    console.error("Erro:", error);
    console.error("Stack:", error.stack);
    return res.status(500).json({ message: "Erro ao criar notificação" });
  }
}

export async function getUserNotifications(req, res) {
  const { userId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const notifications = await NotificationsModel.find({ 
      $or: [
        { userId: parseInt(userId) },  
        { userId: null }                
      ],
      deletedAt: null 
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
    
    console.log(`📬 Buscadas ${notifications.length} notificações para usuário ${userId} (individuais + gerais)`);
    
    return res.success("Notificações consultadas com sucesso!", notifications);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return res.status(500).json({ message: "Erro ao buscar notificações" });
  }
}

export async function markAsRead(req, res) {
  const { notificationId } = req.params;

  try {
    const notification = await NotificationsModel.findOneAndUpdate(
      { notificationId: parseInt(notificationId) },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notificação não encontrada" });
    }

    return res.success("Notificação marcada como lida!", notification);
  } catch (error) {
    console.error("Erro ao marcar como lida:", error);
    return res.status(500).json({ message: "Erro ao marcar como lida" });
  }
}

export async function markAllAsRead(req, res) {
  const { userId } = req.params;

  try {
    await NotificationsModel.updateMany(
      { userId: parseInt(userId), read: false },
      { read: true }
    );

    return res.success("Todas as notificações foram marcadas como lidas!");
  } catch (error) {
    console.error("Erro ao marcar todas como lidas:", error);
    return res.status(500).json({ message: "Erro ao marcar todas como lidas" });
  }
}

export async function deleteNotification(req, res) {
  const { notificationId } = req.params;

  try {
    const notification = await NotificationsModel.findOneAndUpdate(
      { notificationId: parseInt(notificationId) },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notificação não encontrada" });
    }

    return res.success("Notificação excluída com sucesso!", notification);
  } catch (error) {
    console.error("Erro ao excluir notificação:", error);
    return res.status(500).json({ message: "Erro ao excluir notificação" });
  }
}

export async function countUnread(req, res) {
  const { userId } = req.params;

  try {
    const count = await NotificationsModel.countDocuments({ 
      $or: [
        { userId: parseInt(userId) },  
        { userId: null }              
      ],
      read: false,
      deletedAt: null 
    });
    
    console.log(`🔢 Contagem de não lidas para usuário ${userId}: ${count}`);
    
    return res.success("Contagem realizada!", { count });
  } catch (error) {
    console.error("Erro ao contar não lidas:", error);
    return res.status(500).json({ message: "Erro ao contar não lidas" });
  }
}

export async function getAllNotifications(req, res) {
  try {
    const notifications = await NotificationsModel.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(100);
    
    return res.success("Notificações consultadas com sucesso!", notifications);
  } catch (error) {
    console.error("Erro ao buscar todas notificações:", error);
    return res.status(500).json({ message: "Erro ao buscar notificações" });
  }
}
