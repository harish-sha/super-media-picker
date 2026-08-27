import type { SkinTone } from "@company/media-core";

const toneOptions: readonly { readonly value: SkinTone; readonly label: string; readonly symbol: string }[] = [
  { value: "default", label: "Default", symbol: "👋" },
  { value: "light", label: "Light", symbol: "👋🏻" },
  { value: "medium-light", label: "Medium-light", symbol: "👋🏼" },
  { value: "medium", label: "Medium", symbol: "👋🏽" },
  { value: "medium-dark", label: "Medium-dark", symbol: "👋🏾" },
  { value: "dark", label: "Dark", symbol: "👋🏿" },
];

export interface SkinToneSelectorProps {
  readonly value: SkinTone;
  readonly onChange: (tone: SkinTone) => void;
}

export function SkinToneSelector({ value, onChange }: SkinToneSelectorProps) {
  return (
    <label className="mp-tone-selector">
      <span className="mp-visually-hidden">Emoji skin tone</span>
      <select
        aria-label="Emoji skin tone"
        className="mp-tone-selector__select"
        onChange={(event) => onChange(event.currentTarget.value as SkinTone)}
        value={value}
      >
        {toneOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.symbol} {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
