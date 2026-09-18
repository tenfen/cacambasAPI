import ClienteModel from "../models/clientes.js";
import BucketModel from "../models/buckets.js";
import { geocodeEndereco } from "../helpers/geocoding.js";

export async function getAllClientes(req, res) {
  const { userId = null, clienteActive = null } = req.query;

  let filter = { deletedAt: null };

  if (userId !== null) filter = { ...filter, userId: parseInt(userId) };
  if (clienteActive !== null) filter = { ...filter, clienteActive: clienteActive === "true" };

  const clientes = await ClienteModel.find(filter).sort({ clienteNome: 1 });

  if (!clientes) {
    return res.error("Erro ao consultar os clientes");
  }

  return res.success("Clientes consultados com sucesso!", clientes);
}

export async function getClienteById(req, res) {
  const { clienteId } = req.params;

  try {
    const cliente = await ClienteModel.findOne({ clienteId: parseInt(clienteId) });

    if (!cliente) {
      return res.status(404).send({
        status: 404,
        message: "Cliente não encontrado.",
      });
    }

    return res.success("Cliente consultado com sucesso!", cliente);
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao consultar o cliente" });
  }
}

export async function createCliente(req, res) {
  const content = req.body;

  if (!content.userId) {
    return res.status(400).send({
      status: 400,
      message: "Usuário não informado.",
    });
  }

  const getLastItem = await ClienteModel.findOne({}).sort({ clienteId: -1 }).limit(1);
  const clienteId = getLastItem ? getLastItem.clienteId + 1 : 1;

  try {
    /*
     * Latitude/longitude são sempre calculadas a partir do endereço —
     * o usuário nunca precisa (nem deve) digitar isso manualmente.
     */
    const coordenadas = await geocodeEndereco({
      street: content.clienteAddressName,
      number: content.clienteAddressNumber,
      neighborhood: content.clienteAddressNeighborhood,
      city: content.clienteAddressCity,
      state: content.clienteAddressState,
      cep: content.clienteAddressCEP,
    });

    const cliente = new ClienteModel({
      clienteId,
      ...content,
      clienteLatitude: coordenadas?.latitude ?? null,
      clienteLongitude: coordenadas?.longitude ?? null,
    });

    const savedCliente = await cliente.save();

    return res.status(200).send({
      status: 200,
      message: "Cliente salvo com sucesso",
      cliente: savedCliente,
    });
  } catch (err) {
    return res.status(500).send({
      status: 500,
      message: "Erro ao salvar cliente",
      err,
    });
  }
}

export async function updateCliente(req, res) {
  try {
    const update = { ...req.body, updateAt: new Date() };

    /*
     * Se algum dado de endereço foi informado na atualização,
     * recalcula a localização — o usuário nunca precisa digitar
     * latitude/longitude manualmente.
     */
    if (req.body.clienteAddressCity || req.body.clienteAddressCEP) {
      const coordenadas = await geocodeEndereco({
        street: req.body.clienteAddressName,
        number: req.body.clienteAddressNumber,
        neighborhood: req.body.clienteAddressNeighborhood,
        city: req.body.clienteAddressCity,
        state: req.body.clienteAddressState,
        cep: req.body.clienteAddressCEP,
      });

      update.clienteLatitude = coordenadas?.latitude ?? null;
      update.clienteLongitude = coordenadas?.longitude ?? null;
    }

    const cliente = await ClienteModel.findOneAndUpdate(
      { clienteId: parseInt(req.params.clienteId) },
      update,
      { new: true }
    );

    if (!cliente) {
      return res.status(404).send({
        status: 404,
        message: "Cliente não encontrado.",
      });
    }

    return res.status(200).send({
      status: 200,
      message: "Cliente salvo com sucesso",
      cliente: cliente,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao atualizar o cliente" });
  }
}

/**
 * Confirma o recolhimento da caçamba de um cliente: congela o valor
 * faturado nesse aluguel (valor fechado da caçamba, não é por dia) antes
 * de zerar o bucketId — depois disso não tem mais como recuperar.
 */
export async function marcarRecolhida(req, res) {
  try {
    const cliente = await ClienteModel.findOne({
      clienteId: parseInt(req.params.clienteId),
    });

    if (!cliente) {
      return res.status(404).send({
        status: 404,
        message: "Cliente não encontrado.",
      });
    }

    if (!cliente.bucketId) {
      return res.status(400).send({
        status: 400,
        message: "Este cliente não tem caçamba alocada no momento.",
      });
    }

    const bucket = await BucketModel.findOne({ bucketId: cliente.bucketId });

    const agora = new Date();
    const clienteValorFaturado = bucket?.bucketRentalValue ?? null;

    const clienteAtualizado = await ClienteModel.findOneAndUpdate(
      { clienteId: cliente.clienteId },
      {
        bucketId: null,
        clienteActive: false,
        clienteDataSaida: agora,
        clienteValorFaturado,
        updateAt: agora,
      },
      { new: true }
    );

    return res.status(200).send({
      status: 200,
      message: "Caçamba recolhida com sucesso",
      cliente: clienteAtualizado,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao confirmar recolhimento" });
  }
}

/**
 * Receita mensal do próprio negócio do usuário — soma dos valores
 * faturados (congelados no recolhimento), agrupados por mês.
 */
export async function getRevenueSummary(req, res) {
  try {
    const userId = parseInt(req.query.userId);

    const results = await ClienteModel.aggregate([
      { $match: { userId, clienteValorFaturado: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$clienteDataSaida" } },
          total: { $sum: "$clienteValorFaturado" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const revenue = results.map((item) => ({
      month: item._id,
      total: item.total,
      count: item.count,
    }));

    return res.success("Receita consultada com sucesso!", revenue);
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao consultar receita" });
  }
}

export async function deleteCliente(req, res) {
  try {
    const deletedCliente = await ClienteModel.findOneAndDelete({
      clienteId: parseInt(req.params.clienteId),
    });

    if (!deletedCliente) {
      return res.status(404).send({
        status: 404,
        message: "Cliente não encontrado.",
      });
    }

    return res.status(200).send({
      status: 200,
      message: "Cliente excluído com sucesso",
      cliente: deletedCliente,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao excluir cliente", err });
  }
}
