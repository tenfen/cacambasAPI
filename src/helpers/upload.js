import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from "@aws-sdk/lib-storage"
import crypto from "crypto"
import { PassThrough } from 'stream';
import fs from 'fs';




const awsConfigEnv = {
  accessKeyId: process.env.AWS_ACCESS_KEY,       // Defina como uma variável de ambiente
  secretAccessKey: process.env.AWS_SECRET_KEY, // Defina como uma variável de ambiente
  apiVersion: process.env.AWS_API_VERSION,     // Defina como uma variável de ambiente
};

 //AWS.config.update({ region: process.env.AWS_REGION })

export async function awsUploadFile(files, directory) {
  const {base64, fileName, mimeType} = files;
  /*
  const filename = crypto
    .createHash("sha256")
    .update(file.fileName + file.fileSize)
    .digest("hex")

  //const filePath = decodeURIComponent(file.uri.replace('file://', '')); 
  // Verifique se o arquivo existe
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist at path: ${filePath}`);
    return
  }

  const s3Stream = new PassThrough()
  // pipe file and s3 stream to upload
  fs.createReadStream(filePath, { highWaterMark: 1024 * 16 }).pipe(s3Stream)
  console.log('s3Stream---------------------',s3Stream)
*/

  // Verifique se base64 é uma string
  if (typeof base64 !== 'string') {
    console.error('Base64 data is not a string');
    return
  }

  const buffer = Buffer.from(base64, 'base64');

  const upload = new Upload({
    client: new S3Client({ region: process.env.AWS_REGION, credentials: awsConfigEnv }),
    params: {
      Bucket: process.env.AWS_BUCKET,
      Key: `${directory}/${fileName}`,
      Body: buffer,
      ContentType:mimeType,
    },
  });

  try {
    const response = await upload.done().then();
    return response;
  } catch (e) {
    console.error("Unable to upload", e);
  }
}

export async function awsDeleteFiles(key) {
  // pegando a chave da pasta para deletar
  const keyDelete = key.split('/').slice(0, 2).join('/') + '/';
  //const keyDelete = 'devices/202411071950-S23FE/'
  console.log('keyDelete', keyDelete)

  // Configuração do cliente S3
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,  // A região do seu S3
    credentials: awsConfigEnv,       // Suas credenciais (já definidas corretamente)
  });

  try {
    // Parâmetros para deletar o arquivo no S3
    const listParams = {
      Bucket: process.env.AWS_BUCKET, // Nome do seu bucket
      Prefix: keyDelete,                 // A chave do arquivo a ser deletado
    };

    const listCommand = new ListObjectsV2Command(listParams);
    const listedObjects = await s3Client.send(listCommand);

    
    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
      // Verificando se cada objeto possui a chave Key válida
      const deleteObjects = listedObjects.Contents.map(obj => {
        if (!obj.Key) {
          console.error('Objeto sem chave Key:', obj);
          return null; // Ignorar objetos sem chave
        }
        return { Key: obj.Key };
      }).filter(Boolean); // Filtra qualquer valor nulo (objeto sem chave Key)

      if (deleteObjects.length > 0) {
        // Deletar os objetos
        const deleteParams = {
          Bucket: process.env.AWS_BUCKET,
          Delete: {
            Objects: deleteObjects,
          },
        };

        const deleteCommand = new DeleteObjectsCommand(deleteParams);
        const deleteResponse = await s3Client.send(deleteCommand);

        // Retorna a resposta da exclusão
        const res = {
          status: 200,
          message: 'Objetos excluídos com sucesso!',
          data:deleteResponse
        }
        return res
      } else {
        const res = {
          status: 200,
          message: 'Nenhum objeto encontrado com a chave válida para deletar!',
          data:[]
        }
        return res
      }
    } else {
      const res = {
        status: 200,
        message: 'Nenhum objeto encontrado na pasta!',
        data:[]
      }
      return res
    }
  } catch (err) {
    // Tratar erro
    console.error('Erro ao deletar arquivo no S3:', err);
    throw err;  // Repassa o erro para quem chamou a função
  }
 
}
