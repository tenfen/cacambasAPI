import BucketModel from "../models/buckets.js";

export async function getAllBucket(req, res) {
  const { bucketActive = null, userId = null } = req.query;

  let filter = {};

  if (bucketActive !== null) filter = { ...filter, bucketActive: bucketActive === "true" };
  if (userId !== null) filter = { ...filter, userId: parseInt(userId) };

  const buckets = await BucketModel.find(filter);

  if (!buckets) {
    return res.error("Erro ao consultar as caçambas");
  }

  return res.success("Caçambas consultadas com sucesso!", buckets);
}

export async function getBucketById(req, res) {
  const { bucketId } = req.params;

  try {
    const bucket = await BucketModel.findOne({ bucketId: parseInt(bucketId) });

    if (!bucket) {
      return res.status(404).send({
        status: 404,
        message: "Caçamba não encontrada.",
      });
    }

    return res.success("Caçamba consultada com sucesso!", bucket);
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao consultar a caçamba" });
  }
}

export async function createBucket(req, res) {
  const content = req.body;

  if (!content.userId) {
    return res.status(400).send({
      status: 400,
      message: "Usuário não informado.",
    });
  }

  const getLastItem = await BucketModel.findOne({}).sort({ bucketId: -1 }).limit(1);
  const bucketId = getLastItem ? getLastItem.bucketId + 1 : 1;

  try {
    const buckets = {
      bucketId,
      ...content,
    };

    const bucket = new BucketModel(buckets);
    const savedBucket = await bucket.save();

    return res.status(200).send({
      status: 200,
      message: "Caçamba salva com sucesso",
      bucket: savedBucket,
    });
  } catch (err) {
    return res.status(500).send({
      status: 500,
      message: "Erro ao salvar caçamba",
      err,
    });
  }
}

export async function updateBucket(req, res) {
  try {
    const bucket = await BucketModel.findOneAndUpdate(
      { bucketId: parseInt(req.params.bucketId) },
      { ...req.body, updateAt: new Date() },
      { new: true }
    );

    if (!bucket) {
      return res.status(404).send({
        status: 404,
        message: "Caçamba não encontrada.",
      });
    }

    return res.status(200).send({
      status: 200,
      message: "Caçamba salva com sucesso",
      bucket: bucket,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao atualizar a caçamba" });
  }
}

export async function deleteBucket(req, res) {
  try {
    const deletedBucket = await BucketModel.findOneAndDelete({
      bucketId: parseInt(req.params.bucketId),
    });

    if (!deletedBucket) {
      return res.status(404).send({
        status: 404,
        message: "Caçamba não encontrada.",
      });
    }

    return res.status(200).send({
      status: 200,
      message: "Caçamba deletada com sucesso",
      bucket: deletedBucket,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao deletar caçamba", err });
  }
}
