import mongoose from "mongoose";
import LocacaoModel from "../models/locacoes.js";
import ClienteModel from "../models/clientes.js";
import BucketModel from "../models/buckets.js";
import { parseId } from "../helpers/ownership.js";

const CODIGO_DUPLICADO = 11000;

/** Índice da versão que permitia só uma caçamba por cliente. */
const INDICE_ANTIGO = "cliente_aberta";

/** Erro que pode ser mostrado ao usuário. */
export class LocacaoError extends Error {}

export class CacambaOcupadaError extends LocacaoError {
  constructor(bucketName) {
    super(
      bucketName
        ? `A caçamba "${bucketName}" já está alugada.`
        : "Esta caçamba já está alugada."
    );
  }
}

function lerData(valor) {
  if (valor === undefined || valor === null || valor === "") return null;

  const data = typeof valor === "string" ? new Date(valor) : new Date(NaN);
  if (Number.isNaN(data.getTime())) throw new LocacaoError("Data inválida.");

  return data;
}

/**
 * Valida as locações enviadas pelo formulário. Item com "_id" altera datas
 * de uma locação existente; sem "_id" abre uma nova.
 */
export function lerLocacoes(lista) {
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista) || lista.length > 100) {
    throw new LocacaoError("Lista de caçambas inválida.");
  }

  const vistas = new Set();

  return lista.map((item) => {
    const datas = {
      dataEntrada: lerData(item?.dataEntrada),
      dataPrevista: lerData(item?.dataPrevista),
    };

    if (item?._id !== undefined && item?._id !== null) {
      if (typeof item._id !== "string" || !mongoose.isValidObjectId(item._id)) {
        throw new LocacaoError("Locação inválida.");
      }
      return { _id: item._id, ...datas };
    }

    const bucketId = parseId(item?.bucketId);
    if (bucketId === null) throw new LocacaoError("Selecione a caçamba.");
    if (vistas.has(bucketId)) {
      throw new LocacaoError("A mesma caçamba foi escolhida mais de uma vez.");
    }
    vistas.add(bucketId);

    return { bucketId, ...datas };
  });
}

function dadosDaCacamba(bucket) {
  if (!bucket) return {};

  return {
    bucketName: bucket.bucketName,
    bucketNumber: bucket.bucketNumber ?? null,
    valor: bucket.bucketRentalValue ?? null,
  };
}

/**
 * Abre uma locação. O índice único impede que dois clientes fiquem com a
 * mesma caçamba, mesmo em acessos simultâneos.
 */
export async function abrirLocacao(cliente, { bucketId, dataEntrada, dataPrevista }) {
  const { userId, clienteId } = cliente;
  const bucket = await BucketModel.findOne({ bucketId, userId });

  if (!bucket) throw new LocacaoError("Caçamba não encontrada.");

  if (await LocacaoModel.findOne({ bucketId, status: "aberta" })) {
    throw new CacambaOcupadaError(bucket.bucketName);
  }

  try {
    return await LocacaoModel.create({
      userId,
      clienteId,
      clienteNome: cliente.clienteNome,
      bucketId,
      ...dadosDaCacamba(bucket),
      dataEntrada,
      dataPrevista,
    });
  } catch (err) {
    if (err?.code !== CODIGO_DUPLICADO) throw err;

    // Índice antigo ainda presente: não significa caçamba ocupada.
    if (err.keyPattern?.clienteId) {
      throw new LocacaoError("O sistema ainda está sendo atualizado. Tente de novo em alguns minutos.");
    }

    throw new CacambaOcupadaError(bucket.bucketName);
  }
}

/**
 * Abre as locações novas e depois atualiza as datas das existentes. Se uma
 * caçamba estiver ocupada, desfaz as que abriu nesta chamada.
 */
export async function salvarLocacoes(cliente, itens) {
  const { userId, clienteId } = cliente;
  const abertasAgora = [];

  try {
    for (const item of itens.filter((i) => !i._id)) {
      abertasAgora.push(await abrirLocacao(cliente, item));
    }
  } catch (err) {
    for (const locacao of abertasAgora) {
      await LocacaoModel.deleteOne({ _id: locacao._id, status: "aberta" });
    }
    throw err;
  }

  for (const { _id, dataEntrada, dataPrevista } of itens.filter((i) => i._id)) {
    await LocacaoModel.updateOne(
      { _id, userId, clienteId, status: "aberta" },
      { $set: { dataEntrada, dataPrevista } }
    );
  }

  await LocacaoModel.updateMany(
    { userId, clienteId, status: "aberta" },
    { $set: { clienteNome: cliente.clienteNome } }
  );

  return abertasAgora.length;
}

export function listarAbertas({ userId, clienteId }) {
  return LocacaoModel.find({ userId, clienteId, status: "aberta" });
}

/**
 * Remove o vínculo do formato antigo antes de fechar a locação, para a
 * conversão não reabri-la quando a API reiniciar.
 */
async function limparVinculoAntigo({ userId, clienteId }, bucketId) {
  await ClienteModel.updateOne(
    { userId, clienteId, bucketId },
    { $set: { bucketId: null, clienteDataEntrada: null, clienteDataSaida: null } }
  );
}

/** Sem nenhuma caçamba, o cliente fica inativo. */
async function atualizarAtivo({ userId, clienteId }) {
  if (await LocacaoModel.findOne({ userId, clienteId, status: "aberta" })) return;

  await ClienteModel.updateOne(
    { userId, clienteId },
    { $set: { clienteActive: false, updateAt: new Date() } }
  );
}

async function buscarAberta({ userId, clienteId }, locacaoId) {
  const locacao = mongoose.isValidObjectId(locacaoId)
    ? await LocacaoModel.findOne({ _id: locacaoId, userId, clienteId, status: "aberta" })
    : null;

  if (!locacao) throw new LocacaoError("Este aluguel não está mais em andamento.");

  return locacao;
}

/** Encerra uma locação e congela o valor. Repetir não cobra duas vezes. */
export async function concluirLocacao(cliente, locacaoId) {
  const aberta = await buscarAberta(cliente, locacaoId);
  const { userId, bucketId } = aberta;
  const bucket = await BucketModel.findOne({ bucketId, userId });

  await limparVinculoAntigo(cliente, bucketId);

  const concluida = await LocacaoModel.findOneAndUpdate(
    { _id: aberta._id, status: "aberta" },
    {
      $set: {
        status: "concluida",
        dataRecolhimento: new Date(),
        ...(bucket?.bucketRentalValue != null ? { valor: bucket.bucketRentalValue } : {}),
      },
    },
    { new: true }
  );

  if (!concluida) throw new LocacaoError("Este aluguel não está mais em andamento.");

  await atualizarAtivo(cliente);

  return concluida;
}

/** Aluguel lançado por engano ou desistência: não gera receita. */
export async function cancelarLocacao(cliente, locacaoId) {
  const aberta = await buscarAberta(cliente, locacaoId);

  await limparVinculoAntigo(cliente, aberta.bucketId);

  const cancelada = await LocacaoModel.findOneAndUpdate(
    { _id: aberta._id, status: "aberta" },
    { $set: { status: "cancelada" } },
    { new: true }
  );

  if (!cancelada) throw new LocacaoError("Este aluguel não está mais em andamento.");

  await atualizarAtivo(cliente);

  return cancelada;
}

/**
 * Vínculo antigo que não pôde ser convertido porque a mesma caçamba estava
 * em dois clientes: registra direto como concluído.
 */
export async function concluirVinculoAntigo(cliente) {
  const { userId, clienteId, bucketId } = cliente;
  const bucket = await BucketModel.findOne({ bucketId, userId });

  // Só quem remover o vínculo registra o aluguel.
  const anterior = await ClienteModel.findOneAndUpdate(
    { userId, clienteId, bucketId },
    { $set: { bucketId: null, clienteDataEntrada: null, clienteDataSaida: null } }
  );

  if (!anterior) throw new LocacaoError("Este aluguel não está mais em andamento.");

  const locacao = await LocacaoModel.create({
    userId,
    clienteId,
    bucketId,
    clienteNome: cliente.clienteNome,
    dataEntrada: cliente.clienteDataEntrada ?? null,
    dataPrevista: cliente.clienteDataSaida ?? null,
    ...dadosDaCacamba(bucket),
    status: "concluida",
    dataRecolhimento: new Date(),
  });

  await atualizarAtivo(cliente);

  return locacao;
}

/** Remove o índice que limitava cada cliente a uma caçamba. */
async function removerIndiceAntigo() {
  const indices = await LocacaoModel.collection.indexes();

  if (indices.some((indice) => indice.name === INDICE_ANTIGO)) {
    await LocacaoModel.collection.dropIndex(INDICE_ANTIGO);
  }
}

/**
 * Data digitada só como dia é gravada à meia-noite UTC, que no Brasil ainda
 * é o dia anterior. Leva para o meio-dia para não mudar de mês.
 */
function dataDeFaturamento(cliente) {
  const data = cliente.clienteDataSaida ?? cliente.updateAt ?? cliente.createdAt;
  if (!data) return null;

  const result = new Date(data);
  if (result.getTime() % (24 * 60 * 60 * 1000) === 0) result.setUTCHours(12);

  return result;
}

/**
 * Converte os dados do formato antigo, em que o aluguel ficava só no
 * cadastro do cliente. Não altera os clientes e pode rodar várias vezes.
 */
export async function converterClientesAntigos() {
  // Garante os índices únicos antes de gravar.
  await LocacaoModel.init();
  await removerIndiceAntigo();

  const resumo = { faturadas: 0, abertas: 0, conflitos: [] };

  const faturados = await ClienteModel.find({ clienteValorFaturado: { $ne: null } });

  for (const cliente of faturados) {
    const result = await LocacaoModel.updateOne(
      { legacyClienteId: cliente.clienteId },
      {
        $setOnInsert: {
          userId: cliente.userId,
          clienteId: cliente.clienteId,
          clienteNome: cliente.clienteNome,
          status: "concluida",
          // Com outra caçamba já vinculada, as datas são do aluguel atual.
          dataEntrada: cliente.bucketId ? null : cliente.clienteDataEntrada,
          dataRecolhimento: dataDeFaturamento(cliente),
          valor: cliente.clienteValorFaturado,
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount) resumo.faturadas += 1;
  }

  const comCacamba = await ClienteModel.find({ bucketId: { $ne: null }, deletedAt: null });

  for (const cliente of comCacamba) {
    const aberta = await LocacaoModel.findOne({
      userId: cliente.userId,
      clienteId: cliente.clienteId,
      bucketId: cliente.bucketId,
      status: "aberta",
    });

    if (aberta) continue;

    try {
      await abrirLocacao(cliente, {
        bucketId: cliente.bucketId,
        dataEntrada: cliente.clienteDataEntrada ?? null,
        dataPrevista: cliente.clienteDataSaida ?? null,
      });
      resumo.abertas += 1;
    } catch (err) {
      if (!(err instanceof LocacaoError)) throw err;
      resumo.conflitos.push({ clienteId: cliente.clienteId, bucketId: cliente.bucketId });
    }
  }

  return resumo;
}
