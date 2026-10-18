import React, { useId, useLayoutEffect, useState } from 'react';
import type { Complex } from '../config/fractalConfig';
import { parseNumber, toggleSign } from '../utils/viewMath';

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
// The inputs that take negative values get a ± button
const SIGNED: ReadonlySet<Field> = new Set(['centerRe', 'centerIm', 'cRe', 'cIm']);

function draftsOf(v: ControlValues): Drafts {
  return {
    centerRe: v.centerRe, centerIm: v.centerIm, zoom: v.zoom, maxIter: v.maxIter, cRe: v.cRe ?? '', cIm: v.cIm ?? '',
  };
}

// The zoom buttons, the zoom, the render status and the inputs under the simulator canvas.
// The inputs keep what is typed as drafts until Enter or until the input loses focus (the
// numeric keypad of phones has no Enter key); the simulator owns the state.
const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  values, zoomLabel, status, showC, onZoomIn, onZoomOut, onReset, onAutoChange, onApply,
}) => {
  const id = useId();
  const shown = draftsOf(values);
  const fields: Field[] = showC
    ? ['centerRe', 'centerIm', 'zoom', 'maxIter', 'cRe', 'cIm']
    : ['centerRe', 'centerIm', 'zoom', 'maxIter'];
  const [drafts, setDrafts] = useState<Drafts>(shown);
  // The inputs that could not be read when last applied
  const [invalid, setInvalid] = useState<ReadonlySet<Field>>(new Set());

  // New values (a move, a zoom, an applied input) replace the drafts and clear the red marks.
  // A layout effect, so the old drafts are never painted next to the new view.
  const valuesKey = fields.map((f) => shown[f]).join('\n');
  useLayoutEffect(() => {
    setDrafts(draftsOf(values));
    setInvalid(new Set());
  }, [valuesKey]);

  // Applies the drafts. Only the inputs that differ from what is shown are read, and with
  // none of them there is nothing to apply.
  const apply = (next: Drafts) => {
    const typed: Partial<Record<Field, number>> = {};
    const bad = new Set<Field>();
    for (const f of fields) {
      if (next[f] === shown[f]) continue;
      const n = parseNumber(next[f]);
      if (n === null) bad.add(f);
      else typed[f] = n;
    }
    setInvalid(bad);
    if (bad.size > 0 || Object.keys(typed).length === 0) return;
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

  // The numeric keypad: with a decimal point, except for the iteration count
  const input = (f: Field) => (
    <input
      id={`${id}-${f}`}
      className={`form-control form-control-sm${invalid.has(f) ? ' is-invalid' : ''}`}
      aria-invalid={invalid.has(f) ? true : undefined}
      type="text"
      inputMode={f === 'maxIter' ? 'numeric' : 'decimal'}
      enterKeyHint="done"
      autoComplete="off"
      spellCheck={false}
      value={drafts[f]}
      onChange={(e) => {
        const text = e.target.value;
        setDrafts((d) => ({ ...d, [f]: text }));
      }}
      onBlur={() => apply(drafts)}
      onKeyDown={(e) => {
        // Not the Enter that confirms an IME conversion (Safari reports it as keyCode 229)
        if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        apply(drafts);
      }}
    />
  );

  // ± flips the sign of the draft. While its input has focus, the keypad stays open and the
  // value is applied with the rest when the input loses focus; otherwise it is applied now.
  const signButton = (f: Field) => (
    <button
      type="button"
      className="btn btn-outline-secondary"
      aria-label={`Flip the sign of ${LABELS[f]}`}
      // Keep the focus (and the keypad) in the input
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => {
        const next = { ...drafts, [f]: toggleSign(drafts[f]) };
        setDrafts(next);
        if (document.activeElement !== document.getElementById(`${id}-${f}`)) apply(next);
      }}
    >±</button>
  );
  const label = (f: Field) => <label className="form-label small mb-0" htmlFor={`${id}-${f}`}>{LABELS[f]}</label>;

  return (
    <>
      {/* The wrapper is as wide as the canvas; the .row form inside keeps Bootstrap's gutters */}
      <div className="simulator-controls">
        <div className="simulator-toolbar d-flex flex-wrap align-items-center gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onZoomOut}>−</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onZoomIn}>+</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onReset}>Reset</button>
          <span className="simulator-zoom">{zoomLabel}</span>
          {/* Next to the canvas, so it is in view while the canvas is */}
          <span className="simulator-status text-muted">{status}</span>
        </div>
        {/* Nothing to submit: Enter and leaving an input apply the values */}
        <form className="row g-2 mt-2" onSubmit={(e) => e.preventDefault()}>
          {fields.map((f) => (
            <div key={f} className="col-6 col-sm-3">
              {label(f)}
              {SIGNED.has(f) ? (
                <div className="input-group input-group-sm">
                  {input(f)}
                  {signButton(f)}
                </div>
              ) : f === 'maxIter' ? (
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
        </form>
      </div>
    </>
  );
};

export default SimulatorControls;
