import AddressesModel from "../models/addresses.js";
import UserModel from "../models/users.js";



//Criar endereço do usuário
export async function createAddressesUser(req, res) {
    const getLastAddresses = await AddressesModel.findOne({}).sort({addressId: -1}).limit(1)
    const addressId = getLastAddresses.addressId + 1;

      
    // Endpoint POST /api/user 
    try{
        console.log(' Criando endereço para userId:', req.params.userId);
        console.log(' Dados recebidos:', req.body);
        
        const adress = new AddressesModel({
          addressId,
          userId: parseInt(req.params.userId), // Garante que userId seja incluído
          ...req.body
        })
        await adress.save();

        // Endpoint POST /api/address
        try{
            const adrresId={
                userAddressId: addressId
            }
            // Usando findByIdAndUpdate para atualizar os dados
            console.log('userId--',req.params.userId)
            console.log('addresId--', adrresId)
            const updatedUserAdress = await UserModel.findOneAndUpdate({ userId: req.params.userId }, adrresId,{ new: true })  // Retorna o documento atualizado
            // Verifica se o usuário foi encontrado
            console.log('updateUser--',updatedUserAdress)
            if (!updatedUserAdress) {
                return res.status(404).json({ message: "Usuário não encontrado." });
            }

            // Retorna o endereço criado
            //res.status(200).json(updatedUserAdress);
        } catch (error) {
            console.error("Erro ao atualizar o id do endereço do usuário:", error);
            res.status(500).json({ message: "Erro interno no servidor." });
        }
            
        return res.send({adress})
    
        }
        catch{
        return res.status(400).send({error:"Erro ao salvar o endereço"});
        }
      
  }

  //Consultar endereço pelo ID

export async function getAddressById(req, res) {
    const addressId  = req.params.addressId;  
    try {
      const user = await AddressesModel.find({ addressId: addressId }).then(address => {
        // Faça algo com os resultados      
        return res.success("Usuário consultado com sucesso!", address);
      }).catch(err => {
        // Trate o erro
        if (address === false) {
          return res.error("Erro ao consultar o usuário");
        } else if (!address) {
          return res.badRequest("Usuário não encontrado");
        }
      });
    } catch (err) {
        res.status(500).json(err);
        return res
    }
  
  }

// Listar todos os endereços de um usuário
export async function getUserAddresses(req, res) {
  const { userId } = req.params;
  try {
    const addresses = await AddressesModel.find({ 
      userId: parseInt(userId),
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
  const { addressId } = req.params;
  try {
    const updatedAddress = await AddressesModel.findOneAndUpdate(
      { addressId: parseInt(addressId) },
      { ...req.body, updateAt: new Date() },
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
  const { addressId } = req.params;
  try {
    const deletedAddress = await AddressesModel.findOneAndUpdate(
      { addressId: parseInt(addressId) },
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
      { userId: parseInt(userId) },
      { isDefault: false }
    );
    
    // Define o novo endereço como padrão
    const defaultAddress = await AddressesModel.findOneAndUpdate(
      { addressId: parseInt(addressId), userId: parseInt(userId) },
      { isDefault: true, updateAt: new Date() },
      { new: true }
    );
    
    if (!defaultAddress) {
      return res.status(404).json({ message: "Endereço não encontrado" });
    }
    
    // Atualiza o userAddressId do usuário
    await UserModel.findOneAndUpdate(
      { userId: parseInt(userId) },
      { userAddressId: parseInt(addressId) },
      { new: true }
    );
    
    return res.success("Endereço padrão atualizado com sucesso!", defaultAddress);
  } catch (error) {
    console.error("Erro ao definir endereço padrão:", error);
    return res.status(500).json({ message: "Erro ao definir endereço padrão" });
  }
}