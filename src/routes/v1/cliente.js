/**
 * Rotas de clientes.
 */
import { Router } from "express";
import { getAllClientes } from "../../controllers/cliente.js";
import { getClienteById } from "../../controllers/cliente.js";
import { createCliente } from "../../controllers/cliente.js";
import { updateCliente } from "../../controllers/cliente.js";
import { deleteCliente } from "../../controllers/cliente.js";
import { marcarRecolhida } from "../../controllers/cliente.js";
import { getRevenueSummary } from "../../controllers/cliente.js";
import { authenticate, requireSelfOrAdmin } from "../../middlewares/auth.js";

const router = Router();

router.post("/", createCliente);
router.get("/all", getAllClientes);

router.get(
  "/revenue",
  authenticate,
  requireSelfOrAdmin((req) => req.query.userId),
  getRevenueSummary
);

router.get("/:clienteId", getClienteById);
router.put("/:clienteId", updateCliente);

router.put(
  "/:clienteId/recolher",
  authenticate,
  requireSelfOrAdmin((req) => req.body.userId),
  marcarRecolhida
);

router.delete("/:clienteId", deleteCliente);

export default router;
