import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import type { SkinTone } from "@company/media-core";
import {
  getCompactEmoji,
  resolveEmojiVariant,
} from "@company/media-emoji/compact";

const toneOptions: readonly {
  readonly value: SkinTone;
  readonly label: string;
}[] = [
  { value: "default", label: "Default" },
  { value: "light", label: "Light" },
  { value: "medium-light", label: "Medium-light" },
  { value: "medium", label: "Medium" },
  { value: "medium-dark", label: "Medium-dark" },
  { value: "dark", label: "Dark" },
];

const wavingHand = getCompactEmoji("1f44b");

function toneSymbol(tone: SkinTone): string {
  return wavingHand === undefined
    ? "👋"
    : resolveEmojiVariant(wavingHand, tone).value;
}

export interface SkinToneSelectorProps {
  readonly value: SkinTone;
  readonly onChange: (tone: SkinTone) => void;
}

/** Accessible custom listbox that avoids platform select glyph artifacts. */
export function SkinToneSelector({ value, onChange }: SkinToneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      toneOptions.findIndex((option) => option.value === value),
    ),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = `${useId().replaceAll(":", "")}-mp-tone-listbox`;
  const selectedIndex = Math.max(
    0,
    toneOptions.findIndex((option) => option.value === value),
  );
  const selected = toneOptions[selectedIndex]!;

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function openAt(index: number): void {
    setActiveIndex(index);
    setOpen(true);
  }

  function closeAndFocusButton(): void {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function selectTone(tone: SkinTone): void {
    onChange(tone);
    closeAndFocusButton();
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(toneOptions.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAt(selectedIndex);
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    let destination: number | undefined;
    if (event.key === "ArrowDown")
      destination = (index + 1) % toneOptions.length;
    if (event.key === "ArrowUp")
      destination = (index - 1 + toneOptions.length) % toneOptions.length;
    if (event.key === "Home") destination = 0;
    if (event.key === "End") destination = toneOptions.length - 1;
    if (destination !== undefined) {
      event.preventDefault();
      setActiveIndex(destination);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeAndFocusButton();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectTone(toneOptions[index]!.value);
    }
  }

  return (
    <div className="mp-tone-selector" ref={rootRef}>
      <button
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Emoji skin tone: ${selected.label}`}
        className="mp-tone-selector__button"
        onClick={() => (open ? closeAndFocusButton() : openAt(selectedIndex))}
        onKeyDown={handleButtonKeyDown}
        ref={buttonRef}
        title={`Emoji skin tone: ${selected.label}`}
        type="button"
      >
        <span aria-hidden="true" className="mp-tone-selector__glyph">
          {toneSymbol(value)}
        </span>
        <span aria-hidden="true" className="mp-tone-selector__chevron">
          ▾
        </span>
      </button>
      {open ? (
        <div
          aria-label="Emoji skin tone"
          className="mp-tone-menu"
          id={listboxId}
          role="listbox"
        >
          {toneOptions.map((option, index) => {
            const selectedOption = option.value === value;
            return (
              <button
                aria-selected={selectedOption}
                className="mp-tone-menu__option"
                key={option.value}
                onClick={() => selectTone(option.value)}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                tabIndex={index === activeIndex ? 0 : -1}
                type="button"
              >
                <span aria-hidden="true" className="mp-tone-menu__glyph">
                  {toneSymbol(option.value)}
                </span>
                <span>{option.label}</span>
                <span aria-hidden="true" className="mp-tone-menu__check">
                  {selectedOption ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
