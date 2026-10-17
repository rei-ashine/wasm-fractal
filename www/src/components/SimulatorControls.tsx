import React from 'react';

interface SimulatorControlsProps {
  zoomLabel: string;
  status: string;
  onZoomIn(): void;
  onZoomOut(): void;
  onReset(): void;
}

// The zoom buttons and the zoom under the simulator canvas, with the render status below them.
// Display only: the simulator owns the state.
const SimulatorControls: React.FC<SimulatorControlsProps> = ({ zoomLabel, status, onZoomIn, onZoomOut, onReset }) => (
  <>
    <div className="simulator-controls d-flex align-items-center gap-2 mt-2">
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onZoomOut}>−</button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onZoomIn}>+</button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onReset}>Reset</button>
      <span>{zoomLabel}</span>
    </div>
    <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>{status}</p>
  </>
);

export default SimulatorControls;
