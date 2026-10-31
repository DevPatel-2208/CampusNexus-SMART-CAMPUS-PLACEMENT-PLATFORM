const { Offer } = require('../models/Application');

/** Auto-expire offers past offerExpiry (parity with PHP cc_expire_offers). */
async function expireOffers() {
  const today = new Date(new Date().toDateString());
  const r = await Offer.updateMany(
    { status: { $in: ['pending', 'issued', 'viewed'] }, offerExpiry: { $lt: today } },
    { $set: { status: 'expired' } }
  );
  return r.modifiedCount || 0;
}

const LIVE_OFFER = ['pending', 'issued', 'viewed'];

module.exports = { expireOffers, LIVE_OFFER };
