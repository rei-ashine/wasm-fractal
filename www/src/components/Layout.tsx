import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

const Layout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // PrivacyとTermsページではGitHubアイコンを非表示にする要件
  const hideGithubIcon = location.pathname === '/privacy' || location.pathname === '/terms';

  return (
    <div className="container d-flex w-100 h-100 p-3 m-auto flex-column">
      <header>
        <div id="Navigation" className="overlay" style={{ width: menuOpen ? '100%' : '0%' }}>
          <div className="overlay-content">
            <Link to="/" onClick={() => setMenuOpen(false)}><span className="marker">Gallery</span></Link>
            <Link to="/julia" onClick={() => setMenuOpen(false)}><span className="marker">Julia Set</span></Link>
            <Link to="/mandelbrot" onClick={() => setMenuOpen(false)}><span className="marker">Mandelbrot Set</span></Link>
          </div>
        </div>
      </header>

      <nav className="navbar navbar-dark bg-dark fixed-top">
        <Link className="navbar-brand p-3" to="/" style={{ fontSize: '25px' }}>Fractals</Link>
        <div className="hamburger-menu">
          <input 
            type="checkbox" 
            id="menu-btn-check" 
            checked={menuOpen}
            onChange={(e) => setMenuOpen(e.target.checked)}
          />
          <label htmlFor="menu-btn-check" className="menu-btn" id="menu"><span></span></label>
        </div>
      </nav>

      <main role="main" className="container inner m-auto" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      <footer className="mastfoot m-auto mt-auto">
        {!hideGithubIcon && (
          <p>
            <a href="https://github.com/rei-ashine" target="_blank" rel="noopener noreferrer">
              <img className="ribbon btn-pop" src={`${import.meta.env.BASE_URL}assets/GitHub-Mark-120px-plus.png`} alt="GitHub" />
            </a>
          </p>
        )}
        <div className="inner">
          <p>&copy; 2023-{new Date().getFullYear()}, Rei Ashine.<br />
            <Link to="/" style={{ textDecoration: 'none', color: '#485859', fontSize: 'small' }}>| Home |</Link>
            <Link to="/terms" style={{ textDecoration: 'none', color: '#485859', fontSize: 'small' }}> Terms |</Link>
            <Link to="/privacy" style={{ textDecoration: 'none', color: '#485859', fontSize: 'small' }}> Privacy |</Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
