import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FRACTALS } from '../config/fractalConfig';

const Layout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  // The open menu takes the focus, which would otherwise stay behind it on the page, and
  // Escape closes it, giving the focus back to the menu button
  useEffect(() => {
    if (!menuOpen) return;
    firstMenuLinkRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);
  const location = useLocation();

  // PrivacyとTermsページではGitHubアイコンを非表示にする要件
  const hideGithubIcon = location.pathname === '/privacy' || location.pathname === '/terms';

  return (
    <div className="container d-flex w-100 h-100 p-3 m-auto flex-column">
      <header>
        <nav id="Navigation" aria-label="Fractals" className={`overlay${menuOpen ? ' open' : ''}`} style={{ width: menuOpen ? '100%' : '0%' }}>
          <div className="overlay-content">
            <Link ref={firstMenuLinkRef} to="/" onClick={() => setMenuOpen(false)}><span className="marker">Gallery</span></Link>
            {FRACTALS.map((fractal) => (
              <Link key={fractal.type} to={`/${fractal.path}`} onClick={() => setMenuOpen(false)}><span className="marker">{fractal.title}</span></Link>
            ))}
          </div>
        </nav>
      </header>

      <nav className="navbar navbar-dark bg-dark fixed-top">
        <Link className="navbar-brand p-3" to="/" style={{ fontSize: '25px' }}>Fractals</Link>
        <div className="hamburger-menu">
          <button
            ref={menuButtonRef}
            type="button"
            className="menu-btn"
            id="menu"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="Navigation"
            onClick={() => setMenuOpen((open) => !open)}
          ><span></span></button>
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
