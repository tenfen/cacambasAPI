import express from 'express';
import * as NotificationsController from '../../controllers/notifications.js';

const router = express.Router();

// Criar notificação
router.post('/', NotificationsController.createNotification);

// Listar notificações do usuário
router.get('/user/:userId', NotificationsController.getUserNotifications);

// Contar não lidas
router.get('/user/:userId/unread', NotificationsController.countUnread);

// Marcar como lida
router.put('/:notificationId/read', NotificationsController.markAsRead);

// Marcar todas como lidas
router.put('/user/:userId/read-all', NotificationsController.markAllAsRead);

// Deletar notificação
router.delete('/:notificationId', NotificationsController.deleteNotification);

// Listar todas (admin)
router.get('/all', NotificationsController.getAllNotifications);

export default router;
