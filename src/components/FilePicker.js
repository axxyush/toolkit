import { useId, useRef } from 'react';

export default function FilePicker({
  accept,
  multiple = false,
  onChange,
  label = 'Choose file',
  hint,
  files = [],
}) {
  const id = useId();
  const inputRef = useRef(null);

  const summary =
    files.length === 0
      ? 'No file selected'
      : files.length === 1
        ? files[0].name
        : `${files.length} files selected`;

  return (
    <div className="file-picker">
      <input
        id={id}
        ref={inputRef}
        className="file-picker-input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => onChange?.(e.target.files)}
      />
      <div className="file-picker-row">
        <button
          type="button"
          className="btn btn-ghost file-picker-btn"
          onClick={() => inputRef.current?.click()}
        >
          {label}
        </button>
        <span className="file-picker-name" title={summary}>
          {summary}
        </span>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
