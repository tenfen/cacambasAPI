
// redirect
export async function redirectToApp(req, res) {
  const { uri } = req.query;

  if (!uri) {
    return res.status(400).send("URI de redirecionamento não fornecida.");
  }

  // Decodifica a URI
  const returnUri = decodeURIComponent(uri);

  //console.log("Redirecionando para:", returnUri);

  // Redireciona o usuário.
  res.redirect(301, returnUri);
}