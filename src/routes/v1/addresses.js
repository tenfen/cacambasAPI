/**
 * Rotas de autenticação.
 */
/**
 * @Route /v1/addresses
 */
import { Router } from "express";

import { 
  createAddressesUser, 
  getAddressById,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from "../../controllers/addresses.js";


import { authenticate, requireSelfOrAdmin } from "../../middlewares/auth.js";

const router = Router();
const selfOrAdmin = requireSelfOrAdmin((req) => req.params.userId);

router.use(authenticate);

router.post("/createAddressesUser/:userId", selfOrAdmin, createAddressesUser) 
router.get("/one/:addressId", getAddressById);
router.get("/user/:userId", selfOrAdmin, getUserAddresses); // Listar endereços do usuário
router.put("/update/:addressId", updateAddress); // Atualizar endereço
router.delete("/delete/:addressId", deleteAddress); // Deletar endereço
router.put("/setDefault/:userId/:addressId", selfOrAdmin, setDefaultAddress); // Definir como padrão

export default router;
