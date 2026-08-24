import { useEffect, useState } from 'react';
import api from '../api/client';

const TABS = ['Zones', 'Areas', 'Rate Cards', 'Agents', 'Orders'];

export default function AdminHome() {
  const [tab, setTab] = useState('Zones');
  return (
    <div className="page">
      <h1>Admin dashboard</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Zones' && <ZonesPanel />}
      {tab === 'Areas' && <AreasPanel />}
      {tab === 'Rate Cards' && <RateCardsPanel />}
      {tab === 'Agents' && <AgentsPanel />}
      {tab === 'Orders' && <OrdersPanel />}
    </div>
  );
}

function ZonesPanel() {
  const [zones, setZones] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const res = await api.get('/zones');
    setZones(res.data.data);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/zones', { name });
      setName('');
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  }

  return (
    <div className="card">
      <h3>Zones</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={create} className="inline-form">
        <input placeholder="Zone name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit">Add zone</button>
      </form>
      <table>
        <thead><tr><th>ID</th><th>Name</th></tr></thead>
        <tbody>{zones.map((z) => <tr key={z.id}><td>{z.id}</td><td>{z.name}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function AreasPanel() {
  const [areas, setAreas] = useState([]);
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState('');
  const [locality, setLocality] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [a, z] = await Promise.all([api.get('/areas'), api.get('/zones')]);
    setAreas(a.data.data);
    setZones(z.data.data);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/areas', { zoneId: Number(zoneId), pincodeOrLocality: locality });
      setLocality('');
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  }

  return (
    <div className="card">
      <h3>Areas (pincode/locality &rarr; zone)</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={create} className="inline-form">
        <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
          <option value="">Select zone</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <input placeholder="Pincode or locality" value={locality} onChange={(e) => setLocality(e.target.value)} required />
        <button type="submit">Add area</button>
      </form>
      <table>
        <thead><tr><th>ID</th><th>Locality</th><th>Zone</th></tr></thead>
        <tbody>{areas.map((a) => <tr key={a.id}><td>{a.id}</td><td>{a.pincode_or_locality}</td><td>{a.zone_name}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function RateCardsPanel() {
  const [cards, setCards] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ fromZoneId: '', toZoneId: '', orderType: 'B2C', baseRate: '', perKgRate: '', codSurcharge: '' });
  const [error, setError] = useState('');

  async function load() {
    const [c, z] = await Promise.all([api.get('/rate-cards'), api.get('/zones')]);
    setCards(c.data.data);
    setZones(z.data.data);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/rate-cards', {
        fromZoneId: Number(form.fromZoneId), toZoneId: Number(form.toZoneId), orderType: form.orderType,
        baseRate: Number(form.baseRate), perKgRate: Number(form.perKgRate), codSurcharge: Number(form.codSurcharge || 0),
      });
      setForm({ fromZoneId: '', toZoneId: '', orderType: 'B2C', baseRate: '', perKgRate: '', codSurcharge: '' });
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  }

  return (
    <div className="card">
      <h3>Rate cards</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={create} className="inline-form wrap">
        <select value={form.fromZoneId} onChange={(e) => setForm({ ...form, fromZoneId: e.target.value })} required>
          <option value="">From zone</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={form.toZoneId} onChange={(e) => setForm({ ...form, toZoneId: e.target.value })} required>
          <option value="">To zone</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })}>
          <option value="B2C">B2C</option>
          <option value="B2B">B2B</option>
        </select>
        <input type="number" step="0.01" placeholder="Base rate" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Per kg rate" value={form.perKgRate} onChange={(e) => setForm({ ...form, perKgRate: e.target.value })} required />
        <input type="number" step="0.01" placeholder="COD surcharge" value={form.codSurcharge} onChange={(e) => setForm({ ...form, codSurcharge: e.target.value })} />
        <button type="submit">Add rate card</button>
      </form>
      <table>
        <thead><tr><th>From</th><th>To</th><th>Type</th><th>Base</th><th>Per kg</th><th>COD</th></tr></thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.id}><td>{c.from_zone_name}</td><td>{c.to_zone_name}</td><td>{c.order_type}</td><td>{c.base_rate}</td><td>{c.per_kg_rate}</td><td>{c.cod_surcharge}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentsPanel() {
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [userId, setUserId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [a, u, z] = await Promise.all([api.get('/agents'), api.get('/users'), api.get('/zones')]);
    setAgents(a.data.data);
    setUsers(u.data.data.filter((usr) => usr.role === 'agent'));
    setZones(z.data.data);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/agents', { userId: Number(userId), currentZoneId: zoneId ? Number(zoneId) : null });
      setUserId(''); setZoneId('');
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  }

  async function setAvailability(id, availabilityStatus) {
    await api.put(`/agents/${id}`, { availabilityStatus });
    await load();
  }

  return (
    <div className="card">
      <h3>Agent profiles</h3>
      <p className="hint">To create an agent user first, use "Register agent" below, then add their profile here.</p>
      <RegisterAgentUser onDone={load} />
      {error && <div className="error">{error}</div>}
      <form onSubmit={create} className="inline-form">
        <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
          <option value="">Select agent user</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
        </select>
        <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
          <option value="">No zone yet</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <button type="submit">Create agent profile</button>
      </form>
      <table>
        <thead><tr><th>Agent</th><th>Zone</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {agents.map((a) => (
            <tr key={a.id}>
              <td>{a.agent_name}</td><td>{a.zone_name || '—'}</td><td>{a.availability_status}</td>
              <td>
                <select value={a.availability_status} onChange={(e) => setAvailability(a.id, e.target.value)}>
                  <option value="available">available</option>
                  <option value="busy">busy</option>
                  <option value="offline">offline</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegisterAgentUser({ onDone }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', { name, email, password, role: 'agent' });
      setName(''); setEmail(''); setPassword('');
      onDone();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  }

  return (
    <form onSubmit={submit} className="inline-form">
      {error && <div className="error">{error}</div>}
      <input placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Agent email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input placeholder="Temp password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      <button type="submit">Register agent user</button>
    </form>
  );
}

function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const params = status ? { status } : {};
    const res = await api.get('/orders', { params });
    setOrders(res.data.data);
  }
  useEffect(() => { load(); }, [status]);

  async function autoAssign(orderId) {
    setError('');
    try {
      await api.post(`/orders/${orderId}/assign`, {});
      await load();
    } catch (err) { setError(err.response?.data?.error || 'No agent available'); }
  }

  async function override(orderId, newStatus) {
    setError('');
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  }

  const ALL_STATUSES = ['Created', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'];

  return (
    <div className="card">
      <h3>All orders</h3>
      {error && <div className="error">{error}</div>}
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <table>
        <thead><tr><th>ID</th><th>Customer</th><th>Route</th><th>Status</th><th>Charge</th><th>Actions</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td><td>{o.customer_name}</td>
              <td>{o.pickup_zone_name} → {o.drop_zone_name}</td>
              <td>{o.current_status}</td><td>₹{o.charge_amount}</td>
              <td>
                {!o.agent_id && <button onClick={() => autoAssign(o.id)}>Auto-assign</button>}
                <select onChange={(e) => e.target.value && override(o.id, e.target.value)} defaultValue="">
                  <option value="" disabled>Override status</option>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
