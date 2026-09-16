/**
 * Rotas de clientes.
 */
import { Router } from "express";
import { getAllClientes } from "../../controllers/cliente.js";
import { getClienteById } from "../../controllers/cliente.js";
import { createCliente } from "../../controllers/cliente.js";
import { updateCliente } from "../../controllers/cliente.js";
import { deleteCliente } from "../../controllers/cliente.js";

const router = Router();

router.post("/", createCliente);
router.get("/all", getAllClientes);
router.get("/:clienteId", getClienteById);
router.put("/:clienteId", updateCliente);
router.delete("/:clienteId", deleteCliente);

export default router;
