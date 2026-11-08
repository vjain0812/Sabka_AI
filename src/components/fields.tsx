'use client';

import { useId, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  /** Marks the field as needing attention (subtle highlight) and exposes it to jump links. */
  flagged?: boolean;
  anchor?: string;
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid': boolean;
  }) => ReactNode;
};
export function Field({ label, name, hint, error, flagged, anchor, children }: FieldProps) {
  const suffix = useId();
  const id = `${name}-${suffix}`;
  return (
    <div className={`field${flagged ? ' field-flagged' : ''}`} data-field={anchor}>
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {children({
        id,
        'aria-describedby':
          [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') ||
          undefined,
        'aria-invalid': !!error || !!flagged,
      })}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
export function Choices({
  legend,
  options,
  values,
  onChange,
  hint,
  error,
  custom = false,
  exclusive,
}: {
  legend: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  hint?: string;
  error?: string;
  custom?: boolean;
  exclusive?: string;
}) {
  const [newValue, setNewValue] = useState('');
  const [customError, setCustomError] = useState('');
  const id = useId();
  function toggle(option: string) {
    if (values.includes(option)) onChange(values.filter((v) => v !== option));
    else if (option === exclusive) onChange([option]);
    else onChange([...values.filter((v) => v !== exclusive), option]);
  }
  function add() {
    const value = newValue.trim();
    if (!value) {
      setCustomError('Enter a name to add.');
      return;
    }
    if (
      values.some((v) => v.toLowerCase() === value.toLowerCase()) ||
      options.some((v) => v.toLowerCase() === value.toLowerCase())
    ) {
      setCustomError('That option is already listed. Select it above.');
      return;
    }
    if (values.length >= 20) {
      setCustomError('Choose up to 20 items.');
      return;
    }
    onChange([...values.filter((v) => v !== exclusive), value]);
    setNewValue('');
    setCustomError('');
  }
  return (
    <fieldset className="field choice-field" aria-describedby={error ? `${id}-error` : undefined}>
      <legend>{legend}</legend>
      {hint && <p className="field-hint">{hint}</p>}
      <div className="choice-grid">
        {[...options, ...values.filter((v) => !options.includes(v))].map((option) => (
          <label
            className={`check-choice ${values.includes(option) ? 'selected' : ''}`}
            key={option}
          >
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={() => toggle(option)}
            />
            <span>{option}</span>
            {!options.includes(option) && <X size={12} aria-hidden="true" />}
          </label>
        ))}
      </div>
      {custom && (
        <div className="custom-choice">
          <label className="sr-only" htmlFor={`${id}-custom`}>
            Other {legend.toLowerCase()}
          </label>
          <input
            id={`${id}-custom`}
            maxLength={120}
            placeholder="Add another…"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            aria-describedby={customError ? `${id}-custom-error` : undefined}
          />
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={add}
            aria-label={`Add to ${legend.toLowerCase()}`}
          >
            <Plus size={17} />
            Add
          </button>
        </div>
      )}
      {customError && (
        <p className="field-error" id={`${id}-custom-error`}>
          {customError}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
