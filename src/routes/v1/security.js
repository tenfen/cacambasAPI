import { Router } from "express";
import { toggle2FA, send2FACode, verify2FACode, changePassword } from "../../controllers/security.js";

const router = Router();

router.put("/:userId/toggle-2fa", toggle2FA);
router.post("/send-2fa-code", send2FACode);
router.post("/verify-2fa-code", verify2FACode);
router.put("/:userId/change-password", changePassword);

export default router;
