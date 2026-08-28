import { useId, useRef } from "react";

export interface SearchInputProps {
  readonly autoFocus?: boolean;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function SearchInput({
  autoFocus = false,
  value,
  onChange,
}: SearchInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function clear(): void {
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div className="mp-search">
      <label className="mp-visually-hidden" htmlFor={inputId}>
        Search emoji
      </label>
      <span aria-hidden="true" className="mp-search__icon">
        ⌕
      </span>
      <input
        autoFocus={autoFocus}
        className="mp-search__input"
        id={inputId}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="Search emoji…"
        ref={inputRef}
        type="search"
        value={value}
      />
      {value === "" ? null : (
        <button
          aria-label="Clear emoji search"
          className="mp-search__clear"
          onClick={clear}
          title="Clear search"
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
