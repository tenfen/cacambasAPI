import ClienteModel from "../models/clientes.js";
import BucketModel from "../models/buckets.js";
import LocacaoModel from "../models/locacoes.js";
import {
  CacambaOcupadaError,
  abrirOuAtualizarLocacao,
  cancelarLocacaoAberta,
  concluirLocacao,
} from "../services/locacaoService.js";
import { geocodeEndereco } from "../helpers/geocoding.js";
import { isAdmin, ownerFilter, ownerIdForCreate, parseId, pick } from "../helpers/ownership.js";

const CLIENTE_FIELDS = [
  "clienteNome",
  "clienteTelefone",
  "clienteDocumento",
  "clienteEmail",
  "clienteAddressName",
  "clienteAddressNumber",
  "clienteAddressComplement",
  "clienteAddressNeighborhood",
  "clienteAddressCity",
  "clienteAddressState",
  "clienteAddressCEP",
  "clienteAddressReference",
  "clienteActive",
  "clienteNotes",
  "clienteDataEntrada",
  "clienteDataSaida",
  "bucketId",
];

/** A caçamba alocada precisa ser do mesmo dono do cliente. */
async function bucketPertenceAoDono(bucketId, userId) {
  if (bucketId === undefined || bucketId === null) return true;

  const id = parseId(bucketId);
  if (id === null) return false;

  return Boolean(await BucketModel.findOne({ bucketId: id, userId }));
}

export async function getAllClientes(req, res) {
  const { userId = null, clienteActive = null } = req.query;

  let filter = { deletedAt: null, ...ownerFilter(req) };

  // Só admin pode escolher de qual usuário consultar.
  if (isAdmin(req) && userId !== null) filter = { ...filter, userId: parseId(userId) };
  if (clienteActive !== null) filter = { ...filter, clienteActive: clienteActive === "true" };

  const clientes = await ClienteModel.find(filter).sort({ clienteNome: 1 });

  if (!clientes) {
    return res.error("Erro ao consultar os clientes");
  }

  return res.success("Clientes consultados com sucesso!", clientes);
}

export async function getClienteById(req, res) {
  try {
    const cliente = await ClienteModel.findOne({ clienteId: parseId(req.params.clienteId), ...ownerFilter(req) });

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
  const content = pick(req.body, CLIENTE_FIELDS);
  const userId = ownerIdForCreate(req);

  const getLastItem = await ClienteModel.findOne({}).sort({ clienteId: -1 }).limit(1);
  // Considera o histórico: reutilizar o id de um cliente excluído ligaria
  // os aluguéis antigos dele ao cliente novo.
  const lastLocacao = await LocacaoModel.findOne({}).sort({ clienteId: -1 }).limit(1);
  const clienteId =
    Math.max(getLastItem?.clienteId ?? 0, lastLocacao?.clienteId ?? 0) + 1;

  try {
    if (!(await bucketPertenceAoDono(content.bucketId, userId))) {
      return res.status(400).send({ status: 400, message: "Caçamba não encontrada." });
    }

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
      ...content,
      clienteId,
      userId,
      clienteLatitude: coordenadas?.latitude ?? null,
      clienteLongitude: coordenadas?.longitude ?? null,
      // Vinculada só depois que a locação for aberta.
      bucketId: null,
    });

    let savedCliente = await cliente.save();

    if (content.bucketId !== undefined && content.bucketId !== null) {
      const bucketId = parseId(content.bucketId);

      try {
        await abrirOuAtualizarLocacao(savedCliente, bucketId);
      } catch (err) {
        // Não deixa um cadastro pela metade se a caçamba já foi ocupada.
        await ClienteModel.deleteOne({ clienteId, userId });
        throw err;
      }

      savedCliente = await ClienteModel.findOneAndUpdate(
        { clienteId, userId },
        { bucketId, clienteActive: true },
        { new: true }
      );
    }

    return res.status(200).send({
      status: 200,
      message: "Cliente salvo com sucesso",
      cliente: savedCliente,
    });
  } catch (err) {
    if (err instanceof CacambaOcupadaError) {
      return res.status(400).send({ status: 400, message: err.message });
    }

    return res.status(500).send({
      status: 500,
      message: "Erro ao salvar cliente",
      err,
    });
  }
}

export async function updateCliente(req, res) {
  try {
    const atual = await ClienteModel.findOne({ clienteId: parseId(req.params.clienteId), ...ownerFilter(req) });

    if (!atual) {
      return res.status(404).send({
        status: 404,
        message: "Cliente não encontrado.",
      });
    }

    const update = { ...pick(req.body, CLIENTE_FIELDS), updateAt: new Date() };

    // Só valida quando a caçamba muda: a atual pode já ter sido excluída.
    if (
      update.bucketId !== atual.bucketId &&
      !(await bucketPertenceAoDono(update.bucketId, atual.userId))
    ) {
      return res.status(400).send({ status: 400, message: "Caçamba não encontrada." });
    }

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

    const bucketId =
      update.bucketId === undefined ? atual.bucketId : parseId(update.bucketId);

    if (bucketId !== null && bucketId !== undefined) {
      await abrirOuAtualizarLocacao({ ...atual.toObject(), ...update }, bucketId);

      // Novo aluguel: o cliente volta a ficar ativo.
      if (!atual.bucketId) update.clienteActive = true;
    } else if (atual.bucketId) {
      await cancelarLocacaoAberta(atual);
    }

    const cliente = await ClienteModel.findOneAndUpdate(
      { clienteId: parseId(req.params.clienteId), ...ownerFilter(req) },
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
    if (err instanceof CacambaOcupadaError) {
      return res.status(400).send({ status: 400, message: err.message });
    }

    console.log(err);
    return res.status(400).send({ error: "Erro ao atualizar o cliente" });
  }
}

/**
 * Confirma o recolhimento da caçamba de um cliente: encerra a locação,
 * congelando o valor (fechado, não é por dia), e libera o cadastro para um
 * novo aluguel.
 */
export async function marcarRecolhida(req, res) {
  try {
    const cliente = await ClienteModel.findOne({ clienteId: parseId(req.params.clienteId), ...ownerFilter(req) });

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

    const agora = new Date();
    const locacao = await concluirLocacao(cliente, agora);

    const clienteAtualizado = await ClienteModel.findOneAndUpdate(
      { clienteId: cliente.clienteId, userId: cliente.userId },
      {
        bucketId: null,
        clienteActive: false,
        clienteDataEntrada: null,
        clienteDataSaida: null,
        updateAt: agora,
      },
      { new: true }
    );

    return res.status(200).send({
      status: 200,
      message: "Caçamba recolhida com sucesso",
      cliente: clienteAtualizado,
      locacao,
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
    const userId = parseId(req.query.userId);

    const results = await LocacaoModel.aggregate([
      { $match: { userId, status: "concluida", valor: { $ne: null } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$dataRecolhimento",
              timezone: "America/Sao_Paulo",
            },
          },
          total: { $sum: "$valor" },
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

/** Histórico de aluguéis do cliente, do mais recente para o mais antigo. */
export async function getLocacoesDoCliente(req, res) {
  try {
    const locacoes = await LocacaoModel.find({
      clienteId: parseId(req.params.clienteId),
      ...ownerFilter(req),
    }).sort({ createdAt: -1 });

    return res.success("Locações consultadas com sucesso!", locacoes);
  } catch (err) {
    console.log(err);
    return res.status(400).send({ error: "Erro ao consultar locações" });
  }
}

export async function deleteCliente(req, res) {
  try {
    const cliente = await ClienteModel.findOne({ clienteId: parseId(req.params.clienteId), ...ownerFilter(req) });

    if (cliente?.bucketId) {
      return res.status(400).send({
        status: 400,
        message: "Este cliente está com uma caçamba. Marque como recolhida antes de excluir.",
      });
    }

    const deletedCliente = await ClienteModel.findOneAndDelete({ clienteId: parseId(req.params.clienteId), ...ownerFilter(req) });

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
