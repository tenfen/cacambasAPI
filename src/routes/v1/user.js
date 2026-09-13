/**
 * Rotas de autenticação.
 */
import { Router } from "express"
import { getUserById, getAllUsers, createUser, updateProfile, updatePushToken, updateNotificationSettings, requestPasswordReset, resetPassword } from "../../controllers/user.js"

const router = Router();

//router.put("/:userUid", updateUser)

router.get("/all", getAllUsers);
router.get("/one/:userId", getUserById);
router.post("/createUser", createUser);
router.put("/updateProfile", updateProfile);
router.put("/:userId/push-token", updatePushToken);
router.put("/:userId/notification-settings", updateNotificationSettings);
router.post("/requestPasswordReset", requestPasswordReset)
router.put("/resetPassword", resetPassword)

//router.delete("/one/id/:userUid", deleteUser)

export default router
