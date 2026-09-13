/**
 * Rotas de envio de arquivos.
 */
import { Router } from "express"

import { sendImages } from "../../controllers/upload.js"

const router = Router()

router.post("/", sendImages)

export default router
