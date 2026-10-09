import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Mandelbrot from './pages/Mandelbrot';
import Julia from './pages/Julia';
import BurningShip from './pages/BurningShip';
import CelticMandelbrot from './pages/CelticMandelbrot';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="mandelbrot" element={<Mandelbrot />} />
          <Route path="julia" element={<Julia />} />
          <Route path="burning-ship" element={<BurningShip />} />
          <Route path="celtic-mandelbrot" element={<CelticMandelbrot />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
