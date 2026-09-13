
export async function getID(modelName, columnName, fieldUid, transaction) {
  return await models[modelName]
    .findOne({
      attributes: [models[modelName].primaryKeyAttribute],
      where: {
        [columnName]: fieldUid,
      },
      transaction,
    })
    .then((response) => {
      return response[models[modelName].primaryKeyAttribute]
    })
    .catch(() => {
      return false
    })
}
