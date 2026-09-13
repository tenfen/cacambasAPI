/**
 * Rotas de autenticação.
 */
import { Router } from "express";
import { getAllBucket } from "../../controllers/bucket.js";
import { updateBucket } from "../../controllers/bucket.js";
import { createBucket } from "../../controllers/bucket.js";
import { deleteBucket } from "../../controllers/bucket.js";

const router = Router();

router.post("/", createBucket);
router.put("/:brandId", updateBucket);
router.get("/all", getAllBucket);
// router.get("/one", getOneBucket);
router.delete("/delete/:brandId", deleteBucket);

export default router;
