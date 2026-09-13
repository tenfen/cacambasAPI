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


const router = Router();

router.post("/createAddressesUser/:userId", createAddressesUser) 
router.get("/one/:addressId", getAddressById);
router.get("/user/:userId", getUserAddresses); // Listar endereços do usuário
router.put("/update/:addressId", updateAddress); // Atualizar endereço
router.delete("/delete/:addressId", deleteAddress); // Deletar endereço
router.put("/setDefault/:userId/:addressId", setDefaultAddress); // Definir como padrão

export default router;
