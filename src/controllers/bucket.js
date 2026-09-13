import BucketModel from "../models/buckets.js";
import { awsDeleteFiles } from "../helpers/upload.js"


export async function getAllBucket(req, res) {
  const { bucketActive = null } = req.query;

  let filter = {};

  if (bucketActive !== null) filter = { ...filter, deviceTitle };

  const buckets = await BucketModel.find(filter);

  if (!buckets) {
    return res.error("Erro ao consultar as caçambas");
  }

  return res.success("Caçambas consultadas com sucesso!", buckets);
}

export async function getBucketById(req, res) {
  // const { bucketId } = req.params;
  // const bucket = await bucketService.getOneBucket({ id_bucket: bucketId });
  // if (bucket === false) {
  //   return res.error("Erro ao consultar a caçamba");
  // } else if (!bucket) {
  //   return res.badRequest("Caçamba não encontrada");
  // }
  // return res.success("Caçamba consultada com sucesso!", bucket);
}

export async function createBucket(req, res) {
  console.log('chegou no creatBucket-----',req.body);
    const content = req.body;
    const getLastItem = await BucketModel.findOne({}).sort({bucketId: -1}).limit(1);
    const bucketId = getLastItem ? getLastItem.bucketId + 1 : 1; // Se não houver item, adId será 1
    //const adId = getLastItem.adId + 1;

    // Endpoint POST /api/ads
    try{
      const buckets = {
        bucketId,
        ...req.body
      }

       // Cria uma instância do dispositivo
      const bucket = new BrandModel(buckets);

      // Salva o dispositivo e aguarda a operação ser concluída
      const savedBucket = await bucket.save();
      
      return res.status(200).send({ 
        status: 200,
        message: "Caçamba salva com sucesso",
        device: savedBucket });
    }
    catch(err){
      return res.status(500).send({
        status: 500,
        message: 'Erro ao salvar caçamba',err
      });
    }
      
  }

  export async function updateBucket(req, res) {
    try{

        const bucket = await BucketModel.findOneAndUpdate( { bucketId: req.params.bucketId },  // Aqui você usa o campo `deviceId` como critério de busca
          req.body,  // Dados que você quer atualizar
          { new: true })  // Retorna o documento atualizado);

        // Verifica se o dispositivo foi encontrado e atualizado
        if (!bucket) {
          return res.status(404).send({
              status: 404,
              message: 'Caçamba não encontrada.'
          })
        }

        return res.status(200).send({ 
          status: 200,
          message: "Caçamba salva com sucesso",
          bucket: bucket })
    }
    catch (err){
      console.log(err)
      return res.status(400).send( {error: 'Erro ao atualizar a caçamba'})
    }
}

export async function deleteBucket(req, res) {
    try{     
      // Encontrar o dispositivo para pegar o caminho da imagem
      const bucket = await BucketModel.findOne({ bucketId: req.params.bucketId });

      if (!bucket) {
        return res.status(404).send({
          status: 404,
          message: 'Caçamba não encontrada.',
        });
      }

      // Nome do arquivo da imagem no S3 (pode ser armazenado como um caminho ou URL)
      /*
      const imageKey = bucket.bucketImage;  // O caminho da imagem no S3 que você salvou no banco
      console.log('imageKey----', imageKey)
      if (imageKey){
        const response = await awsDeleteFiles(imageKey)
        if (response.status !==200){
          return res.status(500).send({
            status: 500,
            message: 'Imagens não deletadas no AWS', response
          });
        }
      }
        */

      const deletedBucket = await BucketModel.findOneAndDelete({bucketId: req.params.bucketId});
      
      if (!deletedBucket) {
        return res.status(404).send({
          status: 404,
          message: 'Caçamba não encontrada.',
        });
      }

      return res.status(200).send({ 
        status: 200,
        message: "Caçamba deletada com sucesso",
        bucket: deletedBucket
        });

    }catch (err){
      console.log(err)
      return res.status(400).send( {error: 'Erro ao deletar caçamba', err})
    }
}
