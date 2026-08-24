const areaModel = require('../models/areaModel');
const rateCardModel = require('../models/rateCardModel');

const VOLUMETRIC_DIVISOR = 5000;

/**
 * Resolves a pickup/drop address string to a zone by looking up the matching
 * area record. The address is expected to contain (or exactly match) a
 * pincode/locality that has been mapped to a zone by the admin.
 * Throws a descriptive error if no zone can be resolved — the caller (order
 * creation) should surface this as a 400 so the admin knows to add the area mapping.
 */
async function detectZone(addressOrLocality) {
  const area = await areaModel.findByLocality(addressOrLocality.trim());
  if (!area) {
    const err = new Error(
      `Could not detect a zone for "${addressOrLocality}". Ask an admin to map this pincode/locality to a zone.`
    );
    err.status = 400;
    throw err;
  }
  return area.zone_id;
}

/**
 * Volumetric weight (kg) = (L × B × H in cm) / 5000
 */
function calculateVolumetricWeight(lengthCm, breadthCm, heightCm) {
  const volumetric = (lengthCm * breadthCm * heightCm) / VOLUMETRIC_DIVISOR;
  return Math.round(volumetric * 100) / 100; // round to 2 decimal places
}

/**
 * Billing weight is always the higher of actual vs volumetric weight.
 */
function calculateBilledWeight(actualWeightKg, volumetricWeightKg) {
  return Math.max(actualWeightKg, volumetricWeightKg);
}

/**
 * Full charge calculation:
 *  1. Detect pickup & drop zone from the given addresses
 *  2. Compute volumetric weight, bill on max(actual, volumetric)
 *  3. Look up the rate card for (pickupZone -> dropZone, orderType)
 *     — same zone on both sides = intra-zone rate
 *  4. charge = base_rate + (billed_weight * per_kg_rate)
 *  5. add cod_surcharge if paymentType === 'COD'
 *
 * Returns all the intermediate figures so the order record and the
 * "show charge before confirm" UI can both use the exact same numbers.
 */
async function calculateCharge({
  pickupAddress, dropAddress, lengthCm, breadthCm, heightCm,
  actualWeightKg, orderType, paymentType,
}) {
  const pickupZoneId = await detectZone(pickupAddress);
  const dropZoneId = await detectZone(dropAddress);

  const volumetricWeightKg = calculateVolumetricWeight(lengthCm, breadthCm, heightCm);
  const billedWeightKg = calculateBilledWeight(actualWeightKg, volumetricWeightKg);

  const rateCard = await rateCardModel.findByZonesAndType(pickupZoneId, dropZoneId, orderType);
  if (!rateCard) {
    const err = new Error(
      `No rate card configured for this zone pair and order type (${orderType}). Ask an admin to add one.`
    );
    err.status = 400;
    throw err;
  }

  let charge = Number(rateCard.base_rate) + billedWeightKg * Number(rateCard.per_kg_rate);
  if (paymentType === 'COD') {
    charge += Number(rateCard.cod_surcharge);
  }
  charge = Math.round(charge * 100) / 100;

  return {
    pickupZoneId,
    dropZoneId,
    volumetricWeightKg,
    billedWeightKg,
    rateCardUsed: rateCard,
    chargeAmount: charge,
  };
}

module.exports = { detectZone, calculateVolumetricWeight, calculateBilledWeight, calculateCharge };
