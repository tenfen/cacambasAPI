import axios from 'axios'

/**
 * Método responsável por ralizar um determinada requisição
 * @param {*} baseUrl     Domain
 * @param {*} route       Rota (endpoint) da requisição
 * @param {*} params      Parametros da requisição
 * @param {*} method      Metodo da requisição
 * @param {*} headers     Cabeçalhos da requisição
 * @param {*} timeout     Tempo de conexão
 * @returns 
 */
export async function request(baseUrl, route, params, method = "GET", headers = {}, timeout = 30000) {

  // Definindo as configurações da requisição
  let config = {
    // Endereço da API
    baseURL: baseUrl,

    // Rota da requisição
    url: route,

    // Método da requisição
    method: method,

    // Cabeçalho da requisição
    headers: {
      "Accept": "*/*",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/x-www-form-urlencoded",
    },

    // Tempo para execução (10s)
    timeout: timeout,

    withCredentials: false,

    responseType: 'arraybuffer',

    responseEncoding: 'binary'
  }

  // Juntando os dados de cabeçalhos
  // Aqui é utilizado o operador "Spread"
  config.headers = { ...config.headers, ...headers };

  // Verificando se foi informado parametros para a requiição
  // Caso o método seja GET coloca os parametros na URL
  if (!!params) {
    if (method === "GET") {
      config.params = params;
    } else {
      config.data = params;
    }
  }

  // console.log(config);

  // Executando a requisição
  return await axios
    .request(config)
    .then((response) => {
      return {
        status: response.status,
        message: response.data.message || "Sem Mensagem",
        content: response.data,
      }
    })
    .catch((error) => {
      if (error.response) {
        return {
          status: error.response.status,
          message: error.response.data.message,
          content: error.response.data,
        }
      }

      return {
        status: 500,
        message:
          "Ocorreu um erro de comunicação com o servidor. Favor tente mais tarde!",
      }
    })
}