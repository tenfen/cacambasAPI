/**
 * Rotas de envio de arquivos.
 */
import { Router } from "express"

import { authenticate, requireAdmin } from "../../middlewares/auth.js"
import { sendImages } from "../../controllers/upload.js"

const router = Router()

router.post("/", authenticate, requireAdmin, sendImages)

export default router
