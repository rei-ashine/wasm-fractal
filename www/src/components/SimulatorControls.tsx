import React, { useId, useLayoutEffect, useState } from 'react';
import type { Complex } from '../config/fractalConfig';
import { parseNumber } from '../utils/viewMath';

// What the inputs show, already formatted
export interface ControlValues {
  centerRe: string;
  centerIm: string;
  zoom: string;
  maxIter: string;
  auto: boolean;
  // Only on the Julia set's page
  cRe?: string;
  cIm?: string;
}

// The values typed in: a number for each input that was changed, null for the others
export interface AppliedValues {
  centerRe: number | null;
  centerIm: number | null;
  zoom: number | null;
  maxIter: number | null;
  c: Complex | null;
}

interface SimulatorControlsProps {
  values: ControlValues;
  zoomLabel: string;
  status: string;
  // Whether to show the inputs of c
  showC: boolean;
  onZoomIn(): void;
  onZoomOut(): void;
  onReset(): void;
  onAutoChange(auto: boolean): void;
  onApply(v: AppliedValues): void;
}

type Field = 'centerRe' | 'centerIm' | 'zoom' | 'maxIter' | 'cRe' | 'cIm';
type Drafts = Record<Field, string>;

const LABELS: Record<Field, string> = {
  centerRe: 'Center Re', centerIm: 'Center Im', zoom: 'Zoom', maxIter: 'Max iterations', cRe: 'c Re', cIm: 'c Im',
};

function draftsOf(v: ControlValues): Drafts {
  return {
    centerRe: v.centerRe, centerIm: v.centerIm, zoom: v.zoom, maxIter: v.maxIter, cRe: v.cRe ?? '', cIm: v.cIm ?? '',
  };
}

// The zoom buttons and the zoom, the inputs, and the render status under the simulator canvas.
// The inputs keep what is typed as drafts until Enter or Go; the simulator owns the state.
const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  values, zoomLabel, status, showC, onZoomIn, onZoomOut, onReset, onAutoChange, onApply,
}) => {
  const id = useId();
  const shown = draftsOf(values);
  const fields: Field[] = showC
    ? ['centerRe', 'centerIm', 'zoom', 'maxIter', 'cRe', 'cIm']
    : ['centerRe', 'centerIm', 'zoom', 'maxIter'];
  const [drafts, setDrafts] = useState<Drafts>(shown);
  // The inputs that could not be read on the last Enter or Go
  const [invalid, setInvalid] = useState<ReadonlySet<Field>>(new Set());

  // New values (a move, a zoom, an applied input) replace the drafts and clear the red marks.
  // A layout effect, so the old drafts are never painted next to the new view.
  const valuesKey = fields.map((f) => shown[f]).join('\n');
  useLayoutEffect(() => {
    setDrafts(draftsOf(values));
    setInvalid(new Set());
  }, [valuesKey]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only the inputs that differ from what is shown are read
    const typed: Partial<Record<Field, number>> = {};
    const bad = new Set<Field>();
    for (const f of fields) {
      if (drafts[f] === shown[f]) continue;
      const n = parseNumber(drafts[f]);
      if (n === null) bad.add(f);
      else typed[f] = n;
    }
    setInvalid(bad);
    if (bad.size > 0) return;
    const cTyped = typed.cRe !== undefined || typed.cIm !== undefined;
    onApply({
      centerRe: typed.centerRe ?? null,
      centerIm: typed.centerIm ?? null,
      zoom: typed.zoom ?? null,
      maxIter: typed.maxIter ?? null,
      // The part of c not typed keeps its value (shown with String, so Number reads it back exactly)
      c: cTyped ? { re: typed.cRe ?? Number(shown.cRe), im: typed.cIm ?? Number(shown.cIm) } : null,
    });
    // Show the values again even when applying them changes nothing (a center already at its limit)
    setDrafts(shown);
  };

  const input = (f: Field) => (
    <input
      id={`${id}-${f}`}
      className={`form-control form-control-sm${invalid.has(f) ? ' is-invalid' : ''}`}
      type="text"
      autoComplete="off"
      spellCheck={false}
      value={drafts[f]}
      onChange={(e) => {
        const text = e.target.value;
        setDrafts((d) => ({ ...d, [f]: text }));
      }}
    />
  );
  const label = (f: Field) => <label className="form-label small mb-0" htmlFor={`${id}-${f}`}>{LABELS[f]}</label>;

  return (
    <>
      <div className="simulator-controls d-flex align-items-center gap-2 mt-2">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onZoomOut}>−</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onZoomIn}>+</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onReset}>Reset</button>
        <span>{zoomLabel}</span>
      </div>
      <form className="row g-2 mt-2 simulator-controls" onSubmit={submit}>
        {fields.map((f) => (
          <div key={f} className="col-6 col-sm-3">
            {label(f)}
            {f === 'maxIter' ? (
              <div className="d-flex align-items-center gap-2">
                {input(f)}
                <div className="form-check mb-0">
                  <input
                    id={`${id}-auto`}
                    className="form-check-input"
                    type="checkbox"
                    checked={values.auto}
                    onChange={(e) => onAutoChange(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor={`${id}-auto`}>Auto</label>
                </div>
              </div>
            ) : input(f)}
          </div>
        ))}
        <div className="col-6 col-sm-3 d-flex align-items-end">
          <button type="submit" className="btn btn-sm btn-primary">Go</button>
        </div>
      </form>
      <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>{status}</p>
    </>
  );
};

export default SimulatorControls;
