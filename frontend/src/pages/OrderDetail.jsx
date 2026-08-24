import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');

  async function load() {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load order');
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleReschedule(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/orders/${id}/reschedule`, { newDeliveryDate: rescheduleDate });
      setRescheduleDate('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reschedule');
    }
  }

  if (error) return <div className="page"><div className="error">{error}</div></div>;
  if (!order) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <Link to="/">&larr; Back</Link>
      <h1>Order #{order.id}</h1>
      <div className="card">
        <p><strong>Route:</strong> {order.pickup_zone_name} → {order.drop_zone_name}</p>
        <p><strong>Type:</strong> {order.order_type} · {order.payment_type}</p>
        <p><strong>Charge:</strong> ₹{order.charge_amount} (billed weight {order.billed_weight_kg} kg)</p>
        <p><strong>Status:</strong> <span className={`status status-${order.current_status.replace(/\s/g, '')}`}>{order.current_status}</span></p>
      </div>

      <h2>Tracking timeline</h2>
      <div className="timeline">
        {order.timeline.map((t) => (
          <div key={t.id} className="timeline-item">
            <span className="timeline-status">{t.status}</span>
            <span className="timeline-actor">by {t.actor_role}</span>
            <span className="timeline-time">{new Date(t.changed_at).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {order.current_status === 'Failed' && user?.role === 'customer' && (
        <form onSubmit={handleReschedule} className="card">
          <h3>Reschedule delivery</h3>
          <label>New delivery date</label>
          <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} required />
          <button type="submit">Reschedule</button>
        </form>
      )}

      {order.reschedules?.length > 0 && (
        <>
          <h2>Reschedule history</h2>
          <div className="timeline">
            {order.reschedules.map((r) => (
              <div key={r.id} className="timeline-item">
                <span>New date: {r.new_delivery_date}</span>
                <span className="timeline-time">{new Date(r.requested_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
