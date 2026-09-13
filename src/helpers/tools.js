/**
 * Método reponsável por formatar e converter um valor para Float
 * @param value         Valor a ser convertido
 * @returns {number}
 */
export function parseFloat(value) {
  if (typeof value === "string") {
    if (value.indexOf("R$") !== -1) {
      value = value.substring("R$ ".length).replace(".", "")
    }
    value = value.replace(",", ".")
  }

  return Number(parseFloat(value).toFixed(2))
}

export function parseBoolean(value) {
  return value === "true" || value === "1" || value === 1 || value === true
}
