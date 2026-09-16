import ClienteModel from "../models/clientes.js";

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
    const cliente = new ClienteModel({
      clienteId,
      ...content,
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
    const cliente = await ClienteModel.findOneAndUpdate(
      { clienteId: parseInt(req.params.clienteId) },
      { ...req.body, updateAt: new Date() },
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
