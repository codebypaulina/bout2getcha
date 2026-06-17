export function getCategoriesKey(userId) {
  return userId ? ["/api/categories", userId] : null;
}

export function getTransactionsKey(userId) {
  return userId ? ["/api/transactions", userId] : null;
}

export function getCategoryKey(categoryId, userId) {
  return categoryId && userId
    ? [`/api/categories/${categoryId}`, userId]
    : null;
}

export function getTransactionKey(transactionId, userId) {
  return transactionId && userId
    ? [`/api/transactions/${transactionId}`, userId]
    : null;
}
