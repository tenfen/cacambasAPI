import express from "express";

import {
  createCheckout,
  getPaymentStatus,
  getRevenueSummary,
  mercadoPagoWebhook,
} from "../../controllers/payment.js";
import { authenticate, requireAdmin, requireSelfOrAdmin } from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/create-checkout",
  authenticate,
  requireSelfOrAdmin((req) => req.body.userId),
  createCheckout
);

router.get("/revenue", authenticate, requireAdmin, getRevenueSummary);

router.get(
  "/status/:userId",
  authenticate,
  requireSelfOrAdmin((req) => req.params.userId),
  getPaymentStatus
);

/*
 * O Mercado Pago não envia Bearer token — a validação de origem é
 * feita via assinatura HMAC (x-signature), não pelo authenticate.
 */
router.post("/webhook", mercadoPagoWebhook);

export default router;