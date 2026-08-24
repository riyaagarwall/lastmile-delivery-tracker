import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const emptyForm = {
  pickupAddress: '', dropAddress: '', lengthCm: '', breadthCm: '', heightCm: '',
  actualWeightKg: '', orderType: 'B2C', paymentType: 'Prepaid',
};

export default function CustomerHome() {
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadOrders() {
    const res = await api.get('/orders');
    setOrders(res.data.data);
  }

  useEffect(() => { loadOrders(); }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setQuote(null); // any change invalidates the previous quote
  }

  async function getQuote(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/orders/quote', form);
      setQuote(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not calculate charge');
    } finally {
      setLoading(false);
    }
  }

  async function confirmOrder() {
    setError('');
    setLoading(true);
    try {
      await api.post('/orders', form);
      setForm(emptyForm);
      setQuote(null);
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not place order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Place an order</h1>
      <form onSubmit={getQuote} className="card form-grid">
        {error && <div className="error">{error}</div>}
        <label>Pickup address / pincode</label>
        <input value={form.pickupAddress} onChange={(e) => update('pickupAddress', e.target.value)} required />
        <label>Drop address / pincode</label>
        <input value={form.dropAddress} onChange={(e) => update('dropAddress', e.target.value)} required />
        <div className="row">
          <div>
            <label>Length (cm)</label>
            <input type="number" step="0.01" value={form.lengthCm} onChange={(e) => update('lengthCm', e.target.value)} required />
          </div>
          <div>
            <label>Breadth (cm)</label>
            <input type="number" step="0.01" value={form.breadthCm} onChange={(e) => update('breadthCm', e.target.value)} required />
          </div>
          <div>
            <label>Height (cm)</label>
            <input type="number" step="0.01" value={form.heightCm} onChange={(e) => update('heightCm', e.target.value)} required />
          </div>
        </div>
        <label>Actual weight (kg)</label>
        <input type="number" step="0.01" value={form.actualWeightKg} onChange={(e) => update('actualWeightKg', e.target.value)} required />
        <div className="row">
          <div>
            <label>Order type</label>
            <select value={form.orderType} onChange={(e) => update('orderType', e.target.value)}>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </div>
          <div>
            <label>Payment type</label>
            <select value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)}>
              <option value="Prepaid">Prepaid</option>
              <option value="COD">COD</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Calculating...' : 'Calculate charge'}</button>
      </form>

      {quote && (
        <div className="card quote-card">
          <h3>Order summary</h3>
          <p>Volumetric weight: {quote.volumetricWeightKg} kg</p>
          <p>Billed weight: {quote.billedWeightKg} kg</p>
          <p className="charge">Total charge: ₹{quote.chargeAmount}</p>
          <button onClick={confirmOrder} disabled={loading}>{loading ? 'Placing...' : 'Confirm & place order'}</button>
        </div>
      )}

      <h2>Your orders</h2>
      <div className="order-list">
        {orders.length === 0 && <p>No orders yet.</p>}
        {orders.map((o) => (
          <Link to={`/orders/${o.id}`} key={o.id} className="order-row">
            <span>#{o.id}</span>
            <span>{o.pickup_zone_name} → {o.drop_zone_name}</span>
            <span className={`status status-${o.current_status.replace(/\s/g, '')}`}>{o.current_status}</span>
            <span>₹{o.charge_amount}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
