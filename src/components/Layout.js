import { Link, Outlet, useLocation } from 'react-router-dom';
import { tools } from '../data/tools';

export default function Layout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Toolkit home">
          Tool<span>kit</span>
          <i className="brand-mark" aria-hidden="true" />
        </Link>
        <div className="topbar-meta">
          {isHome ? `${tools.length} tools ready` : 'Everyday utilities, one place'}
        </div>
      </header>
      <Outlet />
    </div>
  );
}
