import BucketModel from "../models/buckets.js";
import LocacaoModel from "../models/locacoes.js";
import { isAdmin, ownerFilter, ownerIdForCreate, parseId, pick } from "../helpers/ownership.js";

const BUCKET_FIELDS = [
  "bucketName",
  "bucketNumber",
  "bucketSize",
  "bucketStatus",
  "bucketRentalValue",
  "bucketNotes",
  "bucketActive",
];

/**
 * "Alugada" vem da locação aberta, não do que está gravado. Assim o status
 * nunca fica desatualizado.
 */
async function comStatusReal(buckets) {
  const abertas = await LocacaoModel.find({
    bucketId: { $in: buckets.map((b) => b.bucketId) },
    status: "aberta",
  });
  const alugadas = new Set(abertas.map((l) => l.bucketId));

  return buckets.map((b) => {
    const bucket = b.toObject();

    if (alugadas.has(bucket.bucketId)) bucket.bucketStatus = "alugada";
    else if (bucket.bucketStatus !== "manutencao") bucket.bucketStatus = "disponivel";

    return bucket;
  });
}

/** Campos enviados pelo formulário, sem o status calculado. */
function camposDaCacamba(body) {
  const content = pick(body, BUCKET_FIELDS);
  if (content.bucketStatus === "alugada") delete content.bucketStatus;
  return content;
}

export async function getAllBucket(req, res) {
  const { bucketActive = null, userId = null } = req.query;

  let filter = ownerFilter(req);

  if (bucketActive !== null) filter = { ...filter, bucketActive: bucketActive === "true" };
  // Só admin pode escolher de qual usuário consultar.
  if (isAdmin(req) && userId !== null) filter = { ...filter, userId: parseId(userId) };

  const buckets = await BucketModel.find(filter);

  if (!buckets) {
    return res.error("Erro ao consultar as caçambas");
  }

  return res.success("Caçambas consultadas com sucesso!", await comStatusReal(buckets));
}

export async function getBucketById(req, res) {
  try {
    const bucket = await BucketModel.findOne({ bucketId: parseId(req.params.bucketId), ...ownerFilter(req) });

    if (!bucket) {
      return res.status(404).send({
        status: 404,
        message: "Caçamba não encontrada.",
      });
    }

    return res.success("Caçamba consultada com sucesso!", (await comStatusReal([bucket]))[0]);
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao consultar a caçamba" });
  }
}

export async function createBucket(req, res) {
  const content = camposDaCacamba(req.body);

  const getLastItem = await BucketModel.findOne({}).sort({ bucketId: -1 }).limit(1);
  // Não reutiliza o id de uma caçamba excluída que está no histórico.
  const lastLocacao = await LocacaoModel.findOne({}).sort({ bucketId: -1 }).limit(1);
  const bucketId =
    Math.max(getLastItem?.bucketId ?? 0, lastLocacao?.bucketId ?? 0) + 1;

  try {
    const buckets = {
      ...content,
      bucketId,
      userId: ownerIdForCreate(req),
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
      { bucketId: parseId(req.params.bucketId), ...ownerFilter(req) },
      { ...camposDaCacamba(req.body), updateAt: new Date() },
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
    const bucket = await BucketModel.findOne({ bucketId: parseId(req.params.bucketId), ...ownerFilter(req) });

    if (bucket && (await LocacaoModel.findOne({ bucketId: bucket.bucketId, status: "aberta" }))) {
      return res.status(400).send({
        status: 400,
        message: "Esta caçamba está com um cliente. Marque como recolhida antes de excluir.",
      });
    }

    const deletedBucket = await BucketModel.findOneAndDelete({ bucketId: parseId(req.params.bucketId), ...ownerFilter(req) });

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
