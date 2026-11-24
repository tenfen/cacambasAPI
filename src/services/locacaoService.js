import LocacaoModel from "../models/locacoes.js";
import ClienteModel from "../models/clientes.js";
import BucketModel from "../models/buckets.js";

const CODIGO_DUPLICADO = 11000;

export class CacambaOcupadaError extends Error {
  constructor() {
    super("Esta caçamba já está com outro cliente.");
  }
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
 * Abre a locação do cliente ou atualiza a que já está aberta (datas, nome
 * ou correção da caçamba). O índice único impede que dois clientes fiquem
 * com a mesma caçamba, mesmo em acessos simultâneos.
 */
export async function abrirOuAtualizarLocacao(cliente, bucketId) {
  const { userId, clienteId } = cliente;

  const ocupada = await LocacaoModel.findOne({ bucketId, status: "aberta" });

  if (ocupada && ocupada.clienteId !== clienteId) {
    throw new CacambaOcupadaError();
  }

  const bucket = await BucketModel.findOne({ bucketId, userId });

  try {
    await LocacaoModel.updateOne(
      { userId, clienteId, status: "aberta" },
      {
        $set: {
          bucketId,
          ...dadosDaCacamba(bucket),
          clienteNome: cliente.clienteNome,
          dataEntrada: cliente.clienteDataEntrada ?? null,
          dataPrevista: cliente.clienteDataSaida ?? null,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    if (err?.code === CODIGO_DUPLICADO) throw new CacambaOcupadaError();
    throw err;
  }
}

/** Caçamba retirada do cadastro sem recolhimento: não gera receita. */
export async function cancelarLocacaoAberta({ userId, clienteId }) {
  await LocacaoModel.updateOne(
    { userId, clienteId, status: "aberta" },
    { $set: { status: "cancelada" } }
  );
}

/** Encerra a locação e congela o valor. Repetir não cobra duas vezes. */
export async function concluirLocacao(cliente, agora = new Date()) {
  const { userId, clienteId, bucketId } = cliente;
  const bucket = await BucketModel.findOne({ bucketId, userId });

  const fechamento = {
    status: "concluida",
    dataRecolhimento: agora,
    ...(bucket?.bucketRentalValue != null ? { valor: bucket.bucketRentalValue } : {}),
  };

  const concluida = await LocacaoModel.findOneAndUpdate(
    { userId, clienteId, status: "aberta" },
    { $set: fechamento },
    { new: true }
  );

  if (concluida) return concluida;

  // Recolhimento anterior interrompido antes de atualizar o cliente.
  const anterior = await LocacaoModel.findOne({
    userId,
    clienteId,
    bucketId,
    status: "concluida",
    legacyClienteId: null,
  }).sort({ dataRecolhimento: -1 });

  if (anterior) return anterior;

  // Vínculo antigo que não pôde ser convertido (caçamba duplicada).
  return LocacaoModel.create({
    userId,
    clienteId,
    bucketId,
    clienteNome: cliente.clienteNome,
    dataEntrada: cliente.clienteDataEntrada ?? null,
    dataPrevista: cliente.clienteDataSaida ?? null,
    ...dadosDaCacamba(bucket),
    ...fechamento,
  });
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
      status: "aberta",
    });

    if (aberta) continue;

    try {
      await abrirOuAtualizarLocacao(cliente, cliente.bucketId);
      resumo.abertas += 1;
    } catch (err) {
      if (!(err instanceof CacambaOcupadaError)) throw err;
      resumo.conflitos.push({ clienteId: cliente.clienteId, bucketId: cliente.bucketId });
    }
  }

  return resumo;
}
