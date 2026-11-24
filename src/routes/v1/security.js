import { Router } from "express";
import { toggle2FA, send2FACode, verify2FACode, changePassword } from "../../controllers/security.js";

import { authenticate, requireSelfOrAdmin } from "../../middlewares/auth.js";

const router = Router();
const self = requireSelfOrAdmin((req) => req.params.userId);

router.put("/:userId/toggle-2fa", authenticate, self, toggle2FA);
router.post("/send-2fa-code", send2FACode);
router.post("/verify-2fa-code", verify2FACode);
router.put("/:userId/change-password", authenticate, self, changePassword);

export default router;
