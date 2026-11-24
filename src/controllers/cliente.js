import ClienteModel from "../models/clientes.js";
import LocacaoModel from "../models/locacoes.js";
import {
  LocacaoError,
  cancelarLocacao,
  concluirLocacao,
  concluirVinculoAntigo,
  lerLocacoes,
  listarAbertas,
  salvarLocacoes,
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
];

/** Inclui em cada cliente as caçambas que estão com ele agora. */
async function comLocacoesAbertas(clientes) {
  const abertas = await LocacaoModel.find({
    clienteId: { $in: clientes.map((c) => c.clienteId) },
    status: "aberta",
  });

  return clientes.map((c) => {
    const locacoesAbertas = abertas.filter(
      (l) => l.clienteId === c.clienteId && l.userId === c.userId
    );
    const cliente = c.toObject();
    const temVinculoAntigo =
      Boolean(cliente.bucketId) && !locacoesAbertas.some((l) => l.bucketId === cliente.bucketId);

    return { ...cliente, locacoesAbertas, temVinculoAntigo };
  });
}

function buscarCliente(req) {
  return ClienteModel.findOne({ clienteId: parseId(req.params.clienteId), ...ownerFilter(req) });
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

  return res.success("Clientes consultados com sucesso!", await comLocacoesAbertas(clientes));
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

    return res.success("Cliente consultado com sucesso!", (await comLocacoesAbertas([cliente]))[0]);
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
    const locacoes = lerLocacoes(req.body.locacoes).filter((l) => !l._id);

    // Compatibilidade com o formulário anterior (uma caçamba só).
    if (!locacoes.length && req.body.bucketId) {
      locacoes.push(
        ...lerLocacoes([
          {
            bucketId: req.body.bucketId,
            dataEntrada: req.body.clienteDataEntrada,
            dataPrevista: req.body.clienteDataSaida,
          },
        ])
      );
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
      // Cliente com caçamba é sempre ativo.
      ...(locacoes.length ? { clienteActive: true } : {}),
    });

    const savedCliente = await cliente.save();

    try {
      await salvarLocacoes(savedCliente, locacoes);
    } catch (err) {
      // Não deixa um cadastro pela metade se a caçamba já foi ocupada.
      await ClienteModel.deleteOne({ clienteId, userId });
      throw err;
    }

    return res.status(200).send({
      status: 200,
      message: "Cliente salvo com sucesso",
      cliente: (await comLocacoesAbertas([savedCliente]))[0],
    });
  } catch (err) {
    if (err instanceof LocacaoError) {
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

    const locacoes = lerLocacoes(req.body.locacoes);

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

    const novas = await salvarLocacoes({ ...atual.toObject(), ...update }, locacoes);

    // Novo aluguel: o cliente volta a ficar ativo.
    if (novas) update.clienteActive = true;

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
      cliente: (await comLocacoesAbertas([cliente]))[0],
    });
  } catch (err) {
    if (err instanceof LocacaoError) {
      return res.status(400).send({ status: 400, message: err.message });
    }

    console.log(err);
    return res.status(400).send({ error: "Erro ao atualizar o cliente" });
  }
}

/** Executa uma ação sobre o cliente da rota e devolve a locação afetada. */
function acaoDeLocacao(acao, mensagem) {
  return async (req, res) => {
    try {
      const cliente = await buscarCliente(req);

      if (!cliente) {
        return res.status(404).send({ status: 404, message: "Cliente não encontrado." });
      }

      const locacao = await acao(cliente, req);

      return res.status(200).send({
        status: 200,
        message: mensagem,
        locacao,
        cliente: (await comLocacoesAbertas([await buscarCliente(req)]))[0],
      });
    } catch (err) {
      if (err instanceof LocacaoError) {
        return res.status(400).send({ status: 400, message: err.message });
      }

      console.log(err);
      return res.status(400).send({ status: 400, message: "Erro ao atualizar o aluguel." });
    }
  };
}

/**
 * Confirma o recolhimento de uma caçamba: encerra a locação, congelando o
 * valor (fechado, não é por dia). As outras caçambas do cliente continuam.
 */
export const recolherLocacao = acaoDeLocacao(
  (cliente, req) => concluirLocacao(cliente, req.params.locacaoId),
  "Caçamba recolhida com sucesso"
);

export const cancelarLocacaoDoCliente = acaoDeLocacao(
  (cliente, req) => cancelarLocacao(cliente, req.params.locacaoId),
  "Aluguel cancelado"
);

/**
 * Recolhimento sem informar a locação: vale quando o cliente tem uma só, e
 * para vínculos antigos que não puderam ser convertidos.
 */
export const marcarRecolhida = acaoDeLocacao(async (cliente) => {
  const abertas = await listarAbertas(cliente);

  if (abertas.length > 1) {
    throw new LocacaoError("Este cliente tem mais de uma caçamba. Escolha qual foi recolhida.");
  }

  if (abertas.length === 1) return concluirLocacao(cliente, String(abertas[0]._id));
  if (cliente.bucketId) return concluirVinculoAntigo(cliente);

  throw new LocacaoError("Este cliente não tem caçamba alocada no momento.");
}, "Caçamba recolhida com sucesso");

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
    const cliente = await buscarCliente(req);

    if (cliente && (cliente.bucketId || (await listarAbertas(cliente)).length)) {
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
