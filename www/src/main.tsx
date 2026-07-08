import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Mandelbrot from './pages/Mandelbrot';
import Julia from './pages/Julia';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="mandelbrot" element={<Mandelbrot />} />
          <Route path="julia" element={<Julia />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
