export interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <label className="mp-search">
      <span className="mp-visually-hidden">Search emoji</span>
      <span aria-hidden="true" className="mp-search__icon">
        ⌕
      </span>
      <input
        aria-label="Search emoji"
        className="mp-search__input"
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder="Search emoji…"
        type="search"
        value={value}
      />
    </label>
  );
}
