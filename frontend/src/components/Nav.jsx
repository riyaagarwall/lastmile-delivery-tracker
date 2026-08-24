import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'waybill');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function toggleTheme() {
    setTheme((t) => (t === 'waybill' ? 'slate' : 'waybill'));
  }

  return (
    <nav className="nav">
      <Link to="/" className="brand">Last-Mile Tracker</Link>
      <div className="nav-right">
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'waybill' ? 'Dark Mode' : 'Light Mode'}
        </button>
        {user && (
          <>
            <span className="nav-user">{user.name} ({user.role})</span>
            <button onClick={handleLogout} className="btn-link">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
