import express from "express";

import {
  createCheckout,
  getPaymentStatus,
  mercadoPagoWebhook,
} from "../../controllers/payment.js";

const router = express.Router();

router.post("/create-checkout", createCheckout);

router.get("/status/:userId", getPaymentStatus);

router.post("/webhook", mercadoPagoWebhook);

export default router;