import BannerModel from "../models/banners.js";
import { awsDeleteFiles } from "../helpers/upload.js";

export async function getAllBanners(req, res) {
  const { bannerActive = null } = req.query;

  let filter = {};

  if (bannerActive !== null) filter = { ...filter, bannerActive: bannerActive === "true" };

  const banners = await BannerModel.find(filter).sort({ bannerOrder: 1 });

  if (!banners) {
    return res.error("Erro ao consultar os banners");
  }

  return res.success("Banners consultados com sucesso!", banners);
}

export async function getBannerById(req, res) {
  try {
    const banner = await BannerModel.findOne({ bannerId: req.params.bannerId });

    if (!banner) {
      return res.status(404).send({
        status: 404,
        message: "Banner não encontrado.",
      });
    }

    return res.status(200).send({
      status: 200,
      message: "Banner consultado com sucesso!",
      banner: banner,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao consultar banner", err });
  }
}

export async function createBanner(req, res) {
  console.log("chegou no createBanner-----", req.body);
  const content = req.body;
  const getLastItem = await BannerModel.findOne({}).sort({ bannerId: -1 }).limit(1);
  const bannerId = getLastItem ? getLastItem.bannerId + 1 : 1;

  try {
    const banners = {
      bannerId,
      ...req.body,
    };

    const banner = new BannerModel(banners);
    const savedBanner = await banner.save();

    return res.status(200).send({
      status: 200,
      message: "Banner salvo com sucesso",
      banner: savedBanner,
    });
  } catch (err) {
    return res.status(500).send({
      status: 500,
      message: "Erro ao salvar banner",
      err,
    });
  }
}

export async function updateBanner(req, res) {
  try {
    const banner = await BannerModel.findOneAndUpdate(
      { bannerId: req.params.bannerId },
      req.body,
      { new: true }
    );

    if (!banner) {
      return res.status(404).send({
        status: 404,
        message: "Banner não encontrado.",
      });
    }

    return res.status(200).send({
      status: 200,
      message: "Banner atualizado com sucesso",
      banner: banner,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao atualizar o banner" });
  }
}

export async function deleteBanner(req, res) {
  try {
    const banner = await BannerModel.findOne({ bannerId: req.params.bannerId });

    if (!banner) {
      return res.status(404).send({
        status: 404,
        message: "Banner não encontrado.",
      });
    }

    const imageKey = banner.bannerImage;
    console.log("imageKey----", imageKey);
    if (imageKey) {
      const response = await awsDeleteFiles(imageKey);
      if (response.status !== 200) {
        return res.status(500).send({
          status: 500,
          message: "Imagem não deletada no AWS",
          response,
        });
      }
    }

    const deletedBanner = await BannerModel.findOneAndDelete({ bannerId: req.params.bannerId });

    if (!deletedBanner) {
      return res.status(404).send({
        status: 404,
        message: "Banner não encontrado.",
      });
    }

    return res.status(200).send({
      status: 200,
      message: "Banner deletado com sucesso",
      banner: deletedBanner,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao deletar banner", err });
  }
}
