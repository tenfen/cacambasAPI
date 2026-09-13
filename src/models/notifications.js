import mongoose from 'mongoose';

const notificationsSchema = new mongoose.Schema({
  notificationId: {
    type: Number,
    required: true,
    unique: true
  },
  userId: {
    type: Number,
    required: false, // null = para todos
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'general', // general, promo, alert, system
  },
  read: {
    type: Boolean,
    default: false
  },
  sentBy: {
    type: Number, // adminId que enviou
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

const NotificationsModel = mongoose.model('Notifications', notificationsSchema);

export default NotificationsModel;
