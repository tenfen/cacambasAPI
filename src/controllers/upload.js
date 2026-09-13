import crypto from "crypto"

import { awsDeleteFiles, awsUploadFile } from "../helpers/upload.js"

export async function sendImages(req, res) {
  const { path, keys = "[]", files } = req.body

  try {
    const files  = await req.body.files
    //const files  = await req.files.image

    if (!files) {
      return res.badRequest("Arquivos não identificados!")
    } else if (!path) {
      return res.badRequest("Caminho para armazenar os arquivos não identificado!")
    }

    let result = {}

    //Removendo antigos arquivos do servidor da AWS
    for (const key of keys) {
      if (!!key) await awsDeleteFiles(key)
    }

    console.log('antes do for das imagens')
    for (const file of Array.isArray(files) ? files : [files]) {
      const response = await awsUploadFile(file, path)

      const filename = crypto
        .createHash("sha256")
        .update(file.fileName + file.fileSize)
        .digest("hex")
      const location = response.Location.replace(process.env.AWS_STORAGE_LINK, '');
      if (!!response) {
        result = { ...result, [filename]: location }
      }
    }

    if (Object.keys(result).length > 0) {
      console.log('result-------',result)
      return res.success("Arquivos enviados com sucesso para o servidor!", result)
    }

    return res.error("Erro ao enviar arquivos para o servidor!")
  } catch (e) {
    return res.error("Erro ao enviar arquivos para o servidor!", e)
  }
}
