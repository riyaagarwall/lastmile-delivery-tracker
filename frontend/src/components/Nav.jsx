import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="nav">
      <Link to="/" className="brand">Last-Mile Tracker</Link>
      {user && (
        <div className="nav-right">
          <span className="nav-user">{user.name} ({user.role})</span>
          <button onClick={handleLogout} className="btn-link">Logout</button>
        </div>
      )}
    </nav>
  );
}
