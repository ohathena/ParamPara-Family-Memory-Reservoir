const mongoose = require('mongoose');

// Atlas (and any replica set) supports transactions, a single local mongod does not.
function supportsTransactions() {
  const type = mongoose.connection.getClient?.()?.topology?.description?.type;
  return !!type && type !== 'Single' && type !== 'Unknown';
}

// Runs fn(session) inside a transaction when the database supports it, so multi-step writes are all-or-nothing.
// Without support it runs fn(null) and the steps are ordered so a half-finished run leaves no broken links.
async function withTransaction(fn) {
  if (!supportsTransactions()) return fn(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction, supportsTransactions };
