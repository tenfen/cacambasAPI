/**
 * Geocodificação de endereços brasileiros — o usuário nunca digita
 * latitude/longitude, isso é sempre calculado no servidor.
 */

/**
 * Geocodifica pelo endereço completo (rua, número, bairro, cidade,
 * estado), usando o Nominatim (OpenStreetMap, gratuito, sem chave).
 * Mais preciso que geocodificar só pelo CEP, que pode cobrir uma
 * área grande (vários quarteirões) dependendo da cidade.
 */
export async function getCoordinatesFromAddress({
  street,
  number,
  neighborhood,
  city,
  state,
}) {
  if (!city) {
    return null;
  }

  const partes = [
    [street, number].filter(Boolean).join(", "),
    neighborhood,
    city,
    state,
    "Brasil",
  ].filter(Boolean);

  const query = partes.join(", ");

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          // Exigido pela política de uso do Nominatim.
          "User-Agent": "CacambaFacil/1.0 (contato@cacambafacil.com.br)",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const resultado = data?.[0];

    if (!resultado?.lat || !resultado?.lon) {
      return null;
    }

    return {
      latitude: Number(resultado.lat),
      longitude: Number(resultado.lon),
    };
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", query, error.message);
    return null;
  }
}

/**
 * Geocodificação a partir do CEP, usando a BrasilAPI (gratuita, sem
 * chave). Menos precisa que pelo endereço completo, mas serve de
 * respaldo quando o endereço não tem informação suficiente.
 *
 * https://brasilapi.com.br/api/cep/v2/{cep}
 */
export async function getCoordinatesFromCEP(cep) {
  if (!cep) {
    return null;
  }

  const cepLimpo = String(cep).replace(/\D/g, "");

  if (cepLimpo.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(
      `https://brasilapi.com.br/api/cep/v2/${cepLimpo}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const coordinates = data?.location?.coordinates;

    if (!coordinates?.latitude || !coordinates?.longitude) {
      return null;
    }

    return {
      latitude: Number(coordinates.latitude),
      longitude: Number(coordinates.longitude),
    };
  } catch (error) {
    console.error("Erro ao geocodificar CEP:", cep, error.message);
    return null;
  }
}

/**
 * Ponto único usado pelos controllers: tenta geocodificar pelo
 * endereço completo primeiro (mais preciso); se não conseguir, cai
 * para o CEP.
 */
export async function geocodeEndereco({
  street,
  number,
  neighborhood,
  city,
  state,
  cep,
}) {
  const porEndereco = await getCoordinatesFromAddress({
    street,
    number,
    neighborhood,
    city,
    state,
  });

  if (porEndereco) {
    return porEndereco;
  }

  return getCoordinatesFromCEP(cep);
}
