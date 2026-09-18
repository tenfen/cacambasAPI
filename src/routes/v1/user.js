/**
 * Rotas de autenticação.
 */
import { Router } from "express"
import { getUserById, getAllUsers, createUser, updateProfile, updatePushToken, updateNotificationSettings, requestPasswordReset, resetPassword, updateUserStatus, deleteUser } from "../../controllers/user.js"
import { authenticate, requireAdmin, requireSelfOrAdmin } from "../../middlewares/auth.js"

const router = Router();

router.get("/all", authenticate, requireAdmin, getAllUsers);
router.get("/one/:userId", authenticate, requireSelfOrAdmin((req) => req.params.userId), getUserById);
router.post("/createUser", createUser);
router.put("/updateProfile", authenticate, requireSelfOrAdmin((req) => req.body.userId), updateProfile);
router.put("/:userId/push-token", authenticate, requireSelfOrAdmin((req) => req.params.userId), updatePushToken);
router.put("/:userId/notification-settings", authenticate, requireSelfOrAdmin((req) => req.params.userId), updateNotificationSettings);
router.post("/requestPasswordReset", requestPasswordReset)
router.put("/resetPassword", resetPassword)
router.put("/:userId/status", authenticate, requireAdmin, updateUserStatus);
router.delete("/:userId", authenticate, requireAdmin, deleteUser);

export default router
