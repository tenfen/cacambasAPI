/**
 * Rotas de autenticação.
 */
import { Router } from "express";
import { getAllDevice } from "../../controllers/device.js";
import { getDeviceById } from "../../controllers/device.js";
import { createDevice } from "../../controllers/device.js";
import { updateDevice } from "../../controllers/device.js";
import { deleteDevice } from "../../controllers/device.js";

const router = Router();

router.post("/", createDevice)
router.put("/:deviceId", updateDevice)
router.get("/all", getAllDevice);
router.get("/one/:deviceId", getDeviceById);
router.delete("/delete/:deviceId", deleteDevice)

export default router;
