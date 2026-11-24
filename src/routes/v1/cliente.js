/**
 * Rotas de clientes.
 */
import { Router } from "express";
import { getAllClientes } from "../../controllers/cliente.js";
import { getClienteById } from "../../controllers/cliente.js";
import { createCliente } from "../../controllers/cliente.js";
import { updateCliente } from "../../controllers/cliente.js";
import { deleteCliente } from "../../controllers/cliente.js";
import { getLocacoesDoCliente } from "../../controllers/cliente.js";
import { recolherLocacao } from "../../controllers/cliente.js";
import { cancelarLocacaoDoCliente } from "../../controllers/cliente.js";
import { marcarRecolhida } from "../../controllers/cliente.js";
import { getRevenueSummary } from "../../controllers/cliente.js";
import { authenticate, requireActiveAccount, requireSelfOrAdmin } from "../../middlewares/auth.js";

const router = Router();

router.use(authenticate, requireActiveAccount);

router.post("/", createCliente);
router.get("/all", getAllClientes);

router.get(
  "/revenue",
  requireSelfOrAdmin((req) => req.query.userId),
  getRevenueSummary
);

router.get("/:clienteId/locacoes", getLocacoesDoCliente);
router.get("/:clienteId", getClienteById);
router.put("/:clienteId", updateCliente);

router.put(
  "/:clienteId/recolher",
  marcarRecolhida
);

router.put("/:clienteId/locacoes/:locacaoId/recolher", recolherLocacao);
router.put("/:clienteId/locacoes/:locacaoId/cancelar", cancelarLocacaoDoCliente);

router.delete("/:clienteId", deleteCliente);

export default router;
