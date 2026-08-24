import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const SEQUENCE = ['Created', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];

function nextStatus(current) {
  const idx = SEQUENCE.indexOf(current);
  return idx >= 0 && idx < SEQUENCE.length - 1 ? SEQUENCE[idx + 1] : null;
}

export default function AgentHome() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const res = await api.get('/orders');
    setOrders(res.data.data);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(orderId, status) {
    setError('');
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update status');
    }
  }

  return (
    <div className="page">
      <h1>Your assigned deliveries</h1>
      {error && <div className="error">{error}</div>}
      <div className="order-list">
        {orders.length === 0 && <p>No orders assigned to you right now.</p>}
        {orders.map((o) => {
          const next = nextStatus(o.current_status);
          return (
            <div key={o.id} className="order-row wide">
              <Link to={`/orders/${o.id}`}>#{o.id}</Link>
              <span>{o.pickup_zone_name} → {o.drop_zone_name}</span>
              <span className={`status status-${o.current_status.replace(/\s/g, '')}`}>{o.current_status}</span>
              <div className="actions">
                {next && (
                  <button onClick={() => updateStatus(o.id, next)}>Mark {next}</button>
                )}
                {['Picked Up', 'In Transit', 'Out for Delivery'].includes(o.current_status) && (
                  <button className="btn-danger" onClick={() => updateStatus(o.id, 'Failed')}>Mark Failed</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
