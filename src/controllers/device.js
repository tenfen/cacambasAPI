import DeviceModel from "../models/devices.js";
import { awsDeleteFiles } from "../helpers/upload.js"

export async function getAllDevice(req, res) {
  const { deviceTitle, deviceYear, deviceBrand, deviceMemory, deviceStorage } =
    req.query;

  let filter = {};

  if (deviceTitle) filter = { ...filter, deviceTitle };
  if (deviceYear) filter = { ...filter, deviceYear };
  if (deviceBrand) filter = { ...filter, deviceBrand };
  if (deviceMemory) filter = { ...filter, deviceMemory };
  if (deviceStorage) filter = { ...filter, deviceStorage };

  console.log("FILTER DEVICES", filter);

  const devices = await DeviceModel.find(filter);

  if (!devices) {
    return res.error("Erro ao consultar os dispositivos");
  }

  return res.success("Dispositivos consultados com sucesso!", devices);
}

//Consultar device pelo ID
export async function getDeviceById(req, res) {
  const deviceId  = req.params.deviceId;   
  try {
    await DeviceModel.find({ deviceId: deviceId }).then(device => {
      // Faça algo com os resultados      
      return res.success("Device consultado com sucesso!", device);
    }).catch(err => {
      // Trate o erro
      if (device === false) {
        return res.error("Erro ao consultar o device");
      } else if (!device) {
        return res.badRequest("Device não encontrado");
      }
    });
  } catch (err) {
      res.status(500).json(err);
      return res
  }

}

export async function createDevice(req, res) {
  console.log('chegou no creatDevice-----',req.body);
    const content = req.body;
    const getLastItem = await DeviceModel.findOne({}).sort({deviceId: -1}).limit(1);
    const deviceId = getLastItem ? getLastItem.deviceId + 1 : 1; // Se não houver item, adId será 1
    //const adId = getLastItem.adId + 1;

    // Endpoint POST /api/ads
    try{
      const devices = {
        deviceId,
        ...req.body
      }

       // Cria uma instância do dispositivo
      const device = new DeviceModel(devices);

      // Salva o dispositivo e aguarda a operação ser concluída
      const savedDevice = await device.save();
      
      return res.status(200).send({ 
        status: 200,
        message: "Dispositivo salvo com sucesso",
        device: savedDevice });
    }
    catch(err){
      return res.status(500).send({
        status: 500,
        message: 'Erro ao salvar dispositivo',err
      });
    }
      
  }

  export async function updateDevice(req, res) {
    try{

        const device = await DeviceModel.findOneAndUpdate( { deviceId: req.params.deviceId },  // Aqui você usa o campo `deviceId` como critério de busca
          req.body,  // Dados que você quer atualizar
          { new: true })  // Retorna o documento atualizado);

        // Verifica se o dispositivo foi encontrado e atualizado
        if (!device) {
          return res.status(404).send({
              status: 404,
              message: 'Dispositivo não encontrado.'
          })
        }

        return res.status(200).send({ 
          status: 200,
          message: "Dispositivo salvo com sucesso",
          device: device })
    }
    catch (err){
      console.log(err)
      return res.status(400).send( {error: 'Erro ao atualizar o dispositivo'})
    }
}

export async function deleteDevice(req, res) {
    try{     
      // Encontrar o dispositivo para pegar o caminho da imagem
      const device = await DeviceModel.findOne({ deviceId: req.params.deviceId });

      if (!device) {
        return res.status(404).send({
          status: 404,
          message: 'Dispositivo não encontrado.',
        });
      }

      // Nome do arquivo da imagem no S3 (pode ser armazenado como um caminho ou URL)
      const imageKey = device.deviceImage;  // O caminho da imagem no S3 que você salvou no banco

      const response = await awsDeleteFiles(imageKey)
      if (response.status !==200){
        return res.status(500).send({
          status: 500,
          message: 'Imagens não deletadas no AWS', response
        });
      }

      const deletedDevice = await DeviceModel.findOneAndDelete({deviceId: req.params.deviceId});
      
      if (!deletedDevice) {
        return res.status(404).send({
          status: 404,
          message: 'Dispositivo não encontrado.',
        });
      }

      return res.status(200).send({ 
        status: 200,
        message: "Dispositivo deletado com sucesso",
        device: deletedDevice
        });

    }catch (err){
      console.log(err)
      return res.status(400).send( {error: 'Erro ao deletar dispositivo', err})
    }
}



// export async function createDevice(req, res) {
//   const content = req.body;

// Declarando instancia da transação SQL
// const transaction = await models.sequelize.transaction()

// let brandId = null
// let memoryId = null
// let storageId = null
// let processorId = null

// try {
//   if (content.brand) {
//     const { uuid_brand, nm_brand } = content.brand

//     if (uuid_brand) {
//       brandId = await getID("brand", "uuid_brand", uuid_brand, transaction)
//     } else {
//       const brandCreated = await BrandService.createBrand({ nm_brand, st_brand: true }, transaction)
//       brandId = brandCreated.id_brand
//     }
//   }

//   if (content.memory) {
//     const { uuid_memory, nm_memory } = content.memory

//     if (uuid_memory) {
//       memoryId = await getID("memory", "uuid_memory", uuid_memory, transaction)
//     } else {
//       const memoryCreated = await MemoryService.createMemory({ nm_memory, st_memory: true }, transaction)
//       memoryId = memoryCreated.id_memory
//     }
//   }

//   if (content.storage) {
//     const { uuid_storage, nm_storage } = content.storage

//     if (uuid_storage) {
//       storageId = await getID("storage", "uuid_storage", uuid_storage, transaction)
//     } else {
//       const storageCreated = await StorageService.createStorage({ nm_storage, st_storage: true }, transaction)
//       storageId = storageCreated.id_storage
//     }
//   }

//   if (content.processor) {
//     const { uuid_processor, nm_processor } = content.processor

//     if (uuid_processor) {
//       processorId = await getID("processor", "uuid_processor", uuid_processor, transaction)
//     } else {
//       const processorCreated = await ProcessorService.createProcessor(
//         {
//           nm_processor,
//           st_processor: true,
//         },
//         transaction
//       )
//       processorId = processorCreated.id_processor
//     }
//   }

//   const deviceCreated = await DeviceService.createDevice(
//     {
//       nm_device: content.nm_device,
//       lb_device: content.lb_device,
//       ds_device: content.ds_device,
//       vs_device: content.vs_device,
//       st_device: content.st_device,
//       year_device: content.year_device,
//       broadband_device: content.broadband_device,
//       url_image_device: content.url_image_device,
//       fk_id_brand: brandId,
//       fk_id_memory: memoryId,
//       fk_id_storage: storageId,
//       fk_id_processor: processorId,
//     },
//     transaction
//   )

//   if (deviceCreated) {
//     if (content.categories) {
//       for (const category of content.categories) {
//         const { id_category, nm_category, vl_price, vl_min_price, vl_max_price } = category

//         let categoryId = id_category

//         if (!categoryId) {
//           const categoryCreated = await CategoryService.createCategory({ nm_category, st_category: true }, transaction)
//           if (categoryCreated) {
//             categoryId = categoryCreated.id_category
//           }
//         }

//         await DeviceCategoryService.createDeviceCategory(
//           {
//             vl_price,
//             vl_min_price,
//             vl_max_price,
//             fk_id_category: categoryId,
//             fk_id_device: deviceCreated.id_device,
//           },
//           transaction
//         )
//       }
//     }

//     await transaction.commit()
//     return res.created("Dispositivo criado com sucesso!", deviceCreated)
//   } else {
//     await transaction.rollback()
//     return res.error("Erro ao criar o produto")
//   }
// } catch (error) {
//   await transaction.rollback()
//   logging.error("Erro ao criar o produto", error)
//   return res.error("Erro ao criar o produto")
// }
// }

// export async function updateDevice(req, res) {
//   const { deviceId } = req.params;
//   const content = req.body;

// Declarando instancia da transação SQL
// const transaction = await models.sequelize.transaction()

// let brandId = null
// let memoryId = null
// let storageId = null
// let processorId = null

// try {
//   if (content.brand) {
//     const { uuid_brand, nm_brand } = content.brand

//     if (uuid_brand) {
//       brandId = await getID("brand", "uuid_brand", uuid_brand, transaction)
//     } else {
//       const brandCreated = await BrandService.createBrand({ nm_brand, st_brand: true }, transaction)
//       brandId = brandCreated.id_brand
//     }
//   }

//   if (content.memory) {
//     const { uuid_memory, nm_memory } = content.memory

//     if (uuid_memory) {
//       memoryId = await getID("memory", "uuid_memory", uuid_memory, transaction)
//     } else {
//       const memoryCreated = await MemoryService.createMemory({ nm_memory, st_memory: true }, transaction)
//       memoryId = memoryCreated.id_memory
//     }
//   }

//   if (content.storage) {
//     const { uuid_storage, nm_storage } = content.storage

//     if (uuid_storage) {
//       storageId = await getID("storage", "uuid_storage", uuid_storage, transaction)
//     } else {
//       const storageCreated = await StorageService.createStorage({ nm_storage, st_storage: true }, transaction)
//       storageId = storageCreated.id_storage
//     }
//   }

//   if (content.processor) {
//     const { uuid_processor, nm_processor } = content.processor

//     if (uuid_processor) {
//       processorId = await getID("processor", "uuid_processor", uuid_processor, transaction)
//     } else {
//       const processorCreated = await ProcessorService.createProcessor(
//         {
//           nm_processor,
//           st_processor: true,
//         },
//         transaction
//       )
//       processorId = processorCreated.id_processor
//     }
//   }

//   await DeviceService.updateDevice(
//     deviceId,
//     {
//       nm_device: content.nm_device,
//       lb_device: content.lb_device,
//       ds_device: content.ds_device,
//       vs_device: content.vs_device,
//       st_device: content.st_device,
//       year_device: content.year_device,
//       broadband_device: content.broadband_device,
//       url_image_device: content.url_image_device,
//       fk_id_brand: brandId,
//       fk_id_memory: memoryId,
//       fk_id_storage: storageId,
//       fk_id_processor: processorId,
//     },
//     transaction
//   )

//   if (content.categories) {
//     await DeviceCategoryService.deleteDeviceCategory(
//       {
//         fk_id_device: deviceId,
//       },
//       transaction
//     )

//     for (const category of content.categories) {
//       const { id_category, nm_category, vl_price, vl_min_price, vl_max_price } = category

//       let categoryId = id_category

//       if (!categoryId) {
//         const categoryCreated = await CategoryService.createCategory({ nm_category, st_category: true }, transaction)
//         if (categoryCreated) {
//           categoryId = categoryCreated.id_category
//         }
//       }

//       await DeviceCategoryService.createDeviceCategory(
//         {
//           vl_price,
//           vl_min_price,
//           vl_max_price,
//           fk_id_category: categoryId,
//           fk_id_device: deviceId,
//         },
//         transaction
//       )
//     }
//   }

//   const deviceUpdated = await DeviceService.getOneDevice({ id_device: deviceId }, transaction)

//   await transaction.commit()
//   return res.success("Dispositivo atualizado com sucesso!", deviceUpdated)
// } catch (error) {
//   await transaction.rollback()
//   return logging.error("Erro ao atualizar o dispositivo", error)
// }
// }

// export async function getDeviceById(req, res) {
//   const { deviceId } = req.params;

//   const device = await DeviceService.getOneDevice({ id_device: deviceId });

//   if (device === false) {
//     return res.error("Erro ao consultar o produto");
//   } else if (!device) {
//     return res.badRequest("Dispositivo não encontrado");
//   }

//   return res.success("Dispositivo consultado com sucesso!", device);
// }

// export async function deleteDevice(req, res) {
//   const { deviceId } = req.params;

//   const device = await DeviceService.deleteOneDevice({ id_device: deviceId });

//   if (device === false) {
//     return res.error("Erro ao excluir o produto");
//   } else if (!device) {
//     return res.badRequest("Dispositivo não encontrado");
//   }

//   return res.success("Dispositivo excluído com sucesso!");
// }

// const _parseBoolean = (value) => {
//   return value === "true" || value === "1" || value === 1 || value === true;
// };
