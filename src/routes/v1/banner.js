/**
 * Rotas de banners publicitários.
 */
import { Router } from "express";
import { getAllBanners, getBannerById, createBanner, updateBanner, deleteBanner } from "../../controllers/banner.js";

const router = Router();

router.post("/", createBanner);
router.put("/:bannerId", updateBanner);
router.get("/all", getAllBanners);
router.get("/one/:bannerId", getBannerById);
router.delete("/delete/:bannerId", deleteBanner);

export default router;
