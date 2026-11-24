import AddressesModel from "../models/addresses.js";
import UserModel from "../models/users.js";
import { ownerFilter, parseId, pick } from "../helpers/ownership.js";



const ADDRESS_FIELDS = [
  "addressName",
  "addressNumber",
  "addressCEP",
  "addressReference",
  "addressComplement",
  "addressNeighborhood",
  "addressCity",
  "addressState",
  "addressLatitude",
  "addressLongitude",
  "isDefault",
];

//Criar endereço do usuário
export async function createAddressesUser(req, res) {
  const userId = parseId(req.params.userId);

  try {
    const last = await AddressesModel.findOne({}).sort({ addressId: -1 }).limit(1);
    const addressId = last ? last.addressId + 1 : 1;

    const adress = new AddressesModel({
      ...pick(req.body, ADDRESS_FIELDS),
      addressId,
      userId,
    });
    await adress.save();

    const updatedUser = await UserModel.findOneAndUpdate(
      { userId },
      { userAddressId: addressId },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    return res.send({ adress });
  } catch (error) {
    console.error("Erro ao salvar o endereço:", error);
    return res.status(400).send({ error: "Erro ao salvar o endereço" });
  }
}

//Consultar endereço pelo ID
export async function getAddressById(req, res) {
  try {
    const address = await AddressesModel.find({ addressId: parseId(req.params.addressId), ...ownerFilter(req) });

    return res.success("Endereço consultado com sucesso!", address);
  } catch (error) {
    console.error("Erro ao consultar endereço:", error);
    return res.status(500).json({ message: "Erro ao consultar endereço" });
  }
}

// Listar todos os endereços de um usuário
export async function getUserAddresses(req, res) {
  const { userId } = req.params;
  try {
    const addresses = await AddressesModel.find({ 
      userId: parseId(userId),
      deletedAt: null 
    }).sort({ isDefault: -1, createdAt: -1 });
    
    return res.success("Endereços consultados com sucesso!", addresses);
  } catch (error) {
    console.error("Erro ao buscar endereços:", error);
    return res.status(500).json({ message: "Erro ao buscar endereços" });
  }
}

// Atualizar endereço
export async function updateAddress(req, res) {
  try {
    const updatedAddress = await AddressesModel.findOneAndUpdate(
      { addressId: parseId(req.params.addressId), ...ownerFilter(req) },
      { ...pick(req.body, ADDRESS_FIELDS), updateAt: new Date() },
      { new: true }
    );
    
    if (!updatedAddress) {
      return res.status(404).json({ message: "Endereço não encontrado" });
    }
    
    return res.success("Endereço atualizado com sucesso!", updatedAddress);
  } catch (error) {
    console.error("Erro ao atualizar endereço:", error);
    return res.status(500).json({ message: "Erro ao atualizar endereço" });
  }
}

// Deletar endereço (soft delete)
export async function deleteAddress(req, res) {
  try {
    const deletedAddress = await AddressesModel.findOneAndUpdate(
      { addressId: parseId(req.params.addressId), ...ownerFilter(req) },
      { deletedAt: new Date() },
      { new: true }
    );
    
    if (!deletedAddress) {
      return res.status(404).json({ message: "Endereço não encontrado" });
    }
    
    return res.success("Endereço excluído com sucesso!", deletedAddress);
  } catch (error) {
    console.error("Erro ao excluir endereço:", error);
    return res.status(500).json({ message: "Erro ao excluir endereço" });
  }
}

// Definir endereço como padrão
export async function setDefaultAddress(req, res) {
  const { userId, addressId } = req.params;
  try {
    // Remove o padrão de todos os endereços do usuário
    await AddressesModel.updateMany(
      { userId: parseId(userId) },
      { isDefault: false }
    );
    
    // Define o novo endereço como padrão
    const defaultAddress = await AddressesModel.findOneAndUpdate(
      { addressId: parseId(addressId), userId: parseId(userId) },
      { isDefault: true, updateAt: new Date() },
      { new: true }
    );
    
    if (!defaultAddress) {
      return res.status(404).json({ message: "Endereço não encontrado" });
    }
    
    // Atualiza o userAddressId do usuário
    await UserModel.findOneAndUpdate(
      { userId: parseId(userId) },
      { userAddressId: parseId(addressId) },
      { new: true }
    );
    
    return res.success("Endereço padrão atualizado com sucesso!", defaultAddress);
  } catch (error) {
    console.error("Erro ao definir endereço padrão:", error);
    return res.status(500).json({ message: "Erro ao definir endereço padrão" });
  }
}