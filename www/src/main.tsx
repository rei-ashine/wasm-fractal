import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import FractalPage from './pages/FractalPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { FRACTALS } from './config/fractalConfig';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          {FRACTALS.map((fractal) => (
            // The key makes moving between two fractal pages remount the page, so its
            // math is typeset and its canvas rendered for the new fractal.
            <Route key={fractal.type} path={fractal.path} element={<FractalPage key={fractal.type} fractal={fractal} />} />
          ))}
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
