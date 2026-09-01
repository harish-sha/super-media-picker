import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import type { SkinTone } from "@super-media-picker/core";
import {
  getCompactEmoji,
  resolveEmojiVariant,
} from "@super-media-picker/emoji/compact";

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
const menuViewportMargin = 8;
const menuTriggerGap = 6;
const menuThemeProperties = [
  "--mp-background",
  "--mp-surface-hover",
  "--mp-text",
  "--mp-border",
  "--mp-accent",
  "--mp-focus-ring",
  "--mp-shadow",
  "--mp-radius-sm",
  "--mp-radius-md",
  "--mp-font-family",
  "--mp-emoji-font-family",
  "--mp-font-size",
  "--mp-spacing-sm",
  "--mp-tone-menu-z-index",
] as const;

type MenuPlacement = "above" | "below";
type PortalMenuStyle = CSSProperties &
  Record<string, string | number | undefined>;

interface MenuPosition {
  readonly placement: MenuPlacement;
  readonly style: PortalMenuStyle;
}

function inheritedThemeProperty(
  element: HTMLElement,
  computedStyle: CSSStyleDeclaration,
  property: string,
): string {
  const computedValue = computedStyle.getPropertyValue(property);
  if (computedValue !== "") return computedValue;
  let ancestor: HTMLElement | null = element;
  while (ancestor !== null) {
    const inlineValue = ancestor.style.getPropertyValue(property);
    if (inlineValue !== "") return inlineValue;
    ancestor = ancestor.parentElement;
  }
  return "";
}

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
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const listboxId = `${useId().replaceAll(":", "")}-mp-tone-listbox`;
  const selectedIndex = Math.max(
    0,
    toneOptions.findIndex((option) => option.value === value),
  );
  const selected = toneOptions[selectedIndex]!;
  const menuReady = menuPosition !== null;

  useEffect(() => {
    if (open && menuReady) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, menuReady, open]);

  useEffect(() => {
    if (!open) return;
    const ownerDocument = buttonRef.current?.ownerDocument;
    if (ownerDocument === undefined) return;
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    ownerDocument.addEventListener("pointerdown", handlePointerDown);
    return () =>
      ownerDocument.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const trigger = buttonRef.current;
    const menu = menuRef.current;
    const root = rootRef.current;
    const ownerDocument = trigger?.ownerDocument;
    const ownerWindow = ownerDocument?.defaultView;
    if (
      trigger === null ||
      trigger === undefined ||
      menu === null ||
      root === null ||
      ownerDocument === undefined ||
      ownerWindow === null ||
      ownerWindow === undefined
    ) {
      return;
    }
    const triggerElement = trigger;
    const menuElement = menu;
    const rootElement = root;
    const viewportWindow = ownerWindow;

    function updatePosition(): void {
      const anchor = triggerElement.getBoundingClientRect();
      const menuBounds = menuElement.getBoundingClientRect();
      const visualViewport = viewportWindow.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth = visualViewport?.width ?? viewportWindow.innerWidth;
      const viewportHeight =
        visualViewport?.height ?? viewportWindow.innerHeight;
      const viewportRight = viewportLeft + viewportWidth;
      const viewportBottom = viewportTop + viewportHeight;
      const availableBelow = Math.max(
        0,
        viewportBottom - anchor.bottom - menuTriggerGap - menuViewportMargin,
      );
      const availableAbove = Math.max(
        0,
        anchor.top - viewportTop - menuTriggerGap - menuViewportMargin,
      );
      const placement: MenuPlacement =
        menuBounds.height > availableBelow && availableAbove > availableBelow
          ? "above"
          : "below";
      const availableHeight =
        placement === "above" ? availableAbove : availableBelow;
      const renderedHeight = Math.min(menuBounds.height, availableHeight);
      const top =
        placement === "above"
          ? Math.max(
              viewportTop + menuViewportMargin,
              anchor.top - menuTriggerGap - renderedHeight,
            )
          : Math.min(
              anchor.bottom + menuTriggerGap,
              viewportBottom - menuViewportMargin - renderedHeight,
            );
      const renderedWidth = Math.min(
        menuBounds.width,
        Math.max(0, viewportWidth - menuViewportMargin * 2),
      );
      const minimumLeft = viewportLeft + menuViewportMargin;
      const maximumLeft = Math.max(
        minimumLeft,
        viewportRight - menuViewportMargin - renderedWidth,
      );
      const left = Math.min(
        maximumLeft,
        Math.max(minimumLeft, anchor.right - renderedWidth),
      );
      const sourceStyle = viewportWindow.getComputedStyle(rootElement);
      const style: PortalMenuStyle = {
        colorScheme: sourceStyle.colorScheme,
        fontFamily: sourceStyle.fontFamily,
        fontSize: sourceStyle.fontSize,
        left,
        maxHeight: availableHeight,
        overflowY: "auto",
        position: "fixed",
        top,
        visibility: "visible",
        zIndex: "var(--mp-tone-menu-z-index, 1100)",
      };
      for (const property of menuThemeProperties) {
        style[property] = inheritedThemeProperty(
          rootElement,
          sourceStyle,
          property,
        );
      }
      setMenuPosition({ placement, style });
    }

    updatePosition();
    viewportWindow.addEventListener("resize", updatePosition);
    ownerDocument.addEventListener("scroll", updatePosition, true);
    viewportWindow.visualViewport?.addEventListener("resize", updatePosition);
    viewportWindow.visualViewport?.addEventListener("scroll", updatePosition);
    return () => {
      viewportWindow.removeEventListener("resize", updatePosition);
      ownerDocument.removeEventListener("scroll", updatePosition, true);
      viewportWindow.visualViewport?.removeEventListener(
        "resize",
        updatePosition,
      );
      viewportWindow.visualViewport?.removeEventListener(
        "scroll",
        updatePosition,
      );
    };
  }, [open]);

  function openAt(index: number): void {
    setPortalContainer(buttonRef.current?.ownerDocument.body ?? null);
    setMenuPosition(null);
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
      {open && portalContainer !== null
        ? createPortal(
            <div
              aria-label="Emoji skin tone"
              className="mp-tone-menu mp-tone-menu--portal"
              data-placement={menuPosition?.placement}
              id={listboxId}
              ref={menuRef}
              role="listbox"
              style={
                menuPosition?.style ?? {
                  left: 0,
                  position: "fixed",
                  top: 0,
                  visibility: "hidden",
                }
              }
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
            </div>,
            portalContainer,
          )
        : null}
    </div>
  );
}
