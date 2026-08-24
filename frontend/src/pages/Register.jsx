import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, phone);
      navigate('/customer');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card">
        <h2>Create a customer account</h2>
        <p className="hint">Agent/admin accounts are created by an admin.</p>
        {error && <div className="error">{error}</div>}
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Phone (optional)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
        <p>Have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
