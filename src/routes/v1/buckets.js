/**
 * Rotas de caçambas.
 */
import { Router } from "express";
import { getAllBucket } from "../../controllers/bucket.js";
import { getBucketById } from "../../controllers/bucket.js";
import { updateBucket } from "../../controllers/bucket.js";
import { createBucket } from "../../controllers/bucket.js";
import { deleteBucket } from "../../controllers/bucket.js";

const router = Router();

router.post("/", createBucket);
router.put("/:bucketId", updateBucket);
router.get("/all", getAllBucket);
router.get("/:bucketId", getBucketById);
router.delete("/delete/:bucketId", deleteBucket);

export default router;
