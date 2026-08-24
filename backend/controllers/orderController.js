const orderModel = require('../models/orderModel');
const statusHistoryModel = require('../models/statusHistoryModel');
const rescheduleModel = require('../models/rescheduleModel');
const agentModel = require('../models/agentModel');
const userModel = require('../models/userModel');
const rateEngine = require('../utils/rateEngine');
const assignAgentUtil = require('../utils/assignAgent');
const mailer = require('../utils/mailer');

const STATUS_SEQUENCE = ['Created', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];
const FAILURE_ALLOWED_FROM = ['Picked Up', 'In Transit', 'Out for Delivery'];

function validateOrderInput(body) {
  const required = [
    'pickupAddress', 'dropAddress', 'lengthCm', 'breadthCm', 'heightCm',
    'actualWeightKg', 'orderType', 'paymentType',
  ];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return `${field} is required`;
    }
  }
  const numericFields = ['lengthCm', 'breadthCm', 'heightCm', 'actualWeightKg'];
  for (const field of numericFields) {
    const value = Number(body[field]);
    if (Number.isNaN(value)) return `${field} must be a number`;
    if (value <= 0) return `${field} must be greater than 0`;
  }
  if (!['B2B', 'B2C'].includes(body.orderType)) return 'orderType must be B2B or B2C';
  if (!['Prepaid', 'COD'].includes(body.paymentType)) return 'paymentType must be Prepaid or COD';
  return null;
}

// POST /api/orders/quote — calculate charge WITHOUT creating the order,
// so the frontend can show it to the customer before they confirm.
async function quote(req, res, next) {
  try {
    const validationError = validateOrderInput(req.body);
    if (validationError) return res.status(400).json({ success: false, error: validationError });

    const result = await rateEngine.calculateCharge(req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /api/orders — actually create the order.
// Customer creates their own order (customerId = req.user.id).
// Admin can create on behalf of a customer by passing customerId in the body.
async function create(req, res, next) {
  try {
    const validationError = validateOrderInput(req.body);
    if (validationError) return res.status(400).json({ success: false, error: validationError });

    let customerId = req.user.id;
    if (req.user.role === 'admin' && req.body.customerId) {
      const customer = await userModel.findById(req.body.customerId);
      if (!customer) return res.status(404).json({ success: false, error: 'customerId not found' });
      customerId = customer.id;
    }

    const rateResult = await rateEngine.calculateCharge(req.body);

    const orderId = await orderModel.create({
      customerId,
      createdById: req.user.id,
      pickupAddress: req.body.pickupAddress,
      dropAddress: req.body.dropAddress,
      pickupZoneId: rateResult.pickupZoneId,
      dropZoneId: rateResult.dropZoneId,
      orderType: req.body.orderType,
      paymentType: req.body.paymentType,
      lengthCm: req.body.lengthCm,
      breadthCm: req.body.breadthCm,
      heightCm: req.body.heightCm,
      actualWeightKg: req.body.actualWeightKg,
      volumetricWeightKg: rateResult.volumetricWeightKg,
      billedWeightKg: rateResult.billedWeightKg,
      chargeAmount: rateResult.chargeAmount,
    });

    await statusHistoryModel.record({
      orderId, status: 'Created', actorRole: req.user.role, actorId: req.user.id,
    });

    const order = await orderModel.findById(orderId);
    mailer.sendStatusEmail(order.customer_email, orderId, 'Created');

    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
}

// GET /api/orders — admin: all orders with optional filters; agent: own assigned orders; customer: own orders
async function list(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      const { status, zoneId, agentId } = req.query;
      return res.json({ success: true, data: await orderModel.findAll({ status, zoneId, agentId }) });
    }
    if (req.user.role === 'agent') {
      const agentProfile = await agentModel.findByUserId(req.user.id);
      if (!agentProfile) return res.json({ success: true, data: [] });
      return res.json({ success: true, data: await orderModel.findByAgent(agentProfile.id) });
    }
    // customer
    res.json({ success: true, data: await orderModel.findByCustomer(req.user.id) });
  } catch (err) { next(err); }
}

// GET /api/orders/:id — full detail + tracking timeline
async function getOne(req, res, next) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not your order' });
    }
    if (req.user.role === 'agent') {
      const agentProfile = await agentModel.findByUserId(req.user.id);
      if (!agentProfile || order.agent_id !== agentProfile.id) {
        return res.status(403).json({ success: false, error: 'Not assigned to you' });
      }
    }

    const timeline = await statusHistoryModel.findByOrder(order.id);
    const reschedules = await rescheduleModel.findByOrder(order.id);
    res.json({ success: true, data: { ...order, timeline, reschedules } });
  } catch (err) { next(err); }
}

// POST /api/orders/:id/assign — admin manual assign (agentId in body) or auto-assign (no body / { auto: true })
async function assign(req, res, next) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    let agent;
    if (req.body.agentId) {
      agent = await agentModel.findById(req.body.agentId);
      if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
      if (agent.availability_status !== 'available') {
        return res.status(409).json({ success: false, error: `Agent is currently ${agent.availability_status}, not available` });
      }
      await agentModel.update(agent.id, { availabilityStatus: 'busy' });
    } else {
      agent = await assignAgentUtil.autoAssign(order.pickup_zone_id);
    }

    const updated = await orderModel.assignAgent(order.id, agent.id);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

// PUT /api/orders/:id/status — agent moves through the sequence, or Failed; admin can override to anything
async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const validStatuses = [...STATUS_SEQUENCE, 'Failed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (req.user.role === 'agent') {
      const agentProfile = await agentModel.findByUserId(req.user.id);
      if (!agentProfile || order.agent_id !== agentProfile.id) {
        return res.status(403).json({ success: false, error: 'This order is not assigned to you' });
      }
      // Enforce sequence for agents (admin bypasses this check entirely — see below)
      if (status === 'Failed') {
        if (!FAILURE_ALLOWED_FROM.includes(order.current_status)) {
          return res.status(400).json({ success: false, error: `Cannot mark Failed from status "${order.current_status}"` });
        }
      } else {
        const currentIdx = STATUS_SEQUENCE.indexOf(order.current_status);
        const targetIdx = STATUS_SEQUENCE.indexOf(status);
        if (targetIdx !== currentIdx + 1) {
          return res.status(400).json({
            success: false,
            error: `Invalid transition from "${order.current_status}" to "${status}". Expected "${STATUS_SEQUENCE[currentIdx + 1] || 'no further transitions'}".`,
          });
        }
      }
    }
    // admin: no sequence restriction — can override to any status

    await statusHistoryModel.record({
      orderId: order.id, status, actorRole: req.user.role, actorId: req.user.id,
    });
    const updated = await orderModel.setStatus(order.id, status);

    // On failure, free up the agent so they're available for other orders
    if (status === 'Failed' && order.agent_id) {
      await agentModel.update(order.agent_id, { availabilityStatus: 'available' });
    }
    // On delivery, free up the agent too
    if (status === 'Delivered' && order.agent_id) {
      await agentModel.update(order.agent_id, { availabilityStatus: 'available' });
    }

    mailer.sendStatusEmail(updated.customer_email, order.id, status);

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

// POST /api/orders/:id/reschedule — customer reschedules a Failed order; agent gets reassigned
async function reschedule(req, res, next) {
  try {
    const { newDeliveryDate } = req.body;
    if (!newDeliveryDate) return res.status(400).json({ success: false, error: 'newDeliveryDate is required' });

    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not your order' });
    }
    if (order.current_status !== 'Failed') {
      return res.status(400).json({ success: false, error: 'Only a Failed order can be rescheduled' });
    }

    // Try to auto-assign a fresh agent for the rescheduled attempt; fine if none available yet
    let reassignedAgentId = null;
    try {
      const agent = await assignAgentUtil.autoAssign(order.pickup_zone_id);
      reassignedAgentId = agent.id;
      await orderModel.assignAgent(order.id, agent.id);
    } catch (e) {
      // no agent available right now — reschedule record still gets created, admin can assign manually later
    }

    await rescheduleModel.create({ orderId: order.id, newDeliveryDate, reassignedAgentId });
    await statusHistoryModel.record({
      orderId: order.id, status: 'Created', actorRole: req.user.role, actorId: req.user.id,
    });
    const updated = await orderModel.setStatus(order.id, 'Created');

    mailer.sendStatusEmail(updated.customer_email, order.id, `Rescheduled for ${newDeliveryDate}`);

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

module.exports = { quote, create, list, getOne, assign, updateStatus, reschedule };
