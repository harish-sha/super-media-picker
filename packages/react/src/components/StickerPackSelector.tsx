import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  isSafeMediaUrl,
  type EmojiPack,
  type MediaUrlPolicy,
  type StickerPack,
} from "@super-media-picker/core";
import { useMediaPickerPortalTarget } from "../portalTarget";

const themeProperties = [
  "--mp-background",
  "--mp-surface",
  "--mp-surface-hover",
  "--mp-text",
  "--mp-text-muted",
  "--mp-border",
  "--mp-accent",
  "--mp-focus-ring",
  "--mp-shadow",
  "--mp-radius-sm",
  "--mp-radius-md",
  "--mp-font-family",
] as const;

type MenuStyle = CSSProperties & Record<string, string | number | undefined>;

type VisualPack = Pick<EmojiPack | StickerPack, "icon" | "iconUrl" | "name"> & {
  readonly posterUrl?: string;
};

function isLegacyPackIconUrl(value: string): boolean {
  return /^(?:https?:|blob:|data:image\/|\/|\.\.?\/)/iu.test(value);
}

function PackFallbackIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mp-pack-icon__fallback"
      data-pack-icon-fallback=""
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="M6.5 3.5h7.8l4.2 4.2v9.8a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M14 3.8V8h4.2M8 14.2c1.1 1.4 2.3 2.1 3.8 2.1 1.3 0 2.4-.5 3.2-1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="8.2" cy="11" fill="currentColor" r="1" />
      <circle cx="14.8" cy="11" fill="currentColor" r="1" />
    </svg>
  );
}

/** Safe pack artwork with a platform-independent SVG fallback. */
export function MediaPackIcon({
  pack,
  mediaSecurity,
}: {
  readonly pack: VisualPack;
  readonly mediaSecurity?: MediaUrlPolicy;
}) {
  const legacyUrl =
    pack.icon !== undefined && isLegacyPackIconUrl(pack.icon)
      ? pack.icon
      : undefined;
  const candidate = pack.iconUrl ?? pack.posterUrl ?? legacyUrl;
  const iconUrl =
    candidate !== undefined && isSafeMediaUrl(candidate, mediaSecurity)
      ? candidate
      : undefined;
  const [failedUrl, setFailedUrl] = useState<string>();
  if (iconUrl === undefined || failedUrl === iconUrl)
    return <PackFallbackIcon />;
  return (
    <img
      alt=""
      className="mp-pack-icon__image"
      onError={() => setFailedUrl(iconUrl)}
      src={iconUrl}
    />
  );
}

function inheritedThemeValue(
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

interface PackDescriptor {
  readonly id: string;
  readonly name: string;
}

export interface MediaPackSelectorProps<T extends PackDescriptor> {
  readonly packs: readonly T[];
  readonly selectedId: string;
  readonly renderIcon: (pack: T) => ReactNode;
  readonly onSelect: (id: string) => void;
  readonly mediaLabel?: string;
}

/** Portal-backed pack listbox that stays usable with large pack catalogs. */
export function MediaPackSelector<T extends PackDescriptor>({
  packs,
  selectedId,
  renderIcon,
  onSelect,
  mediaLabel = "media",
}: MediaPackSelectorProps<T>) {
  const selectedIndex = Math.max(
    0,
    packs.findIndex(({ id }) => id === selectedId),
  );
  const selectedPack = packs[selectedIndex];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const preferredPortalTarget = useMediaPickerPortalTarget();
  const [menuStyle, setMenuStyle] = useState<MenuStyle | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = `${useId().replaceAll(":", "")}-mp-${mediaLabel}-packs`;

  useEffect(() => {
    if (open && menuStyle !== null) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, menuStyle, open]);

  useEffect(() => {
    if (!open) return;
    const ownerDocument = triggerRef.current?.ownerDocument;
    if (ownerDocument === undefined) return;
    function handlePointerDown(event: PointerEvent): void {
      const path = event.composedPath();
      if (
        !path.includes(rootRef.current as EventTarget) &&
        !path.includes(menuRef.current as EventTarget)
      )
        setOpen(false);
    }
    ownerDocument.addEventListener("pointerdown", handlePointerDown);
    return () =>
      ownerDocument.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
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
    )
      return;
    const triggerElement = trigger;
    const menuElement = menu;
    const rootElement = root;
    const viewportWindow = ownerWindow;

    function updatePosition(): void {
      const sourceStyle = viewportWindow.getComputedStyle(rootElement);
      const style: MenuStyle = {
        colorScheme: sourceStyle.colorScheme,
        fontFamily: sourceStyle.fontFamily,
        fontSize: sourceStyle.fontSize,
        position: "fixed",
        visibility: "visible",
        zIndex: "var(--mp-tone-menu-z-index, 1100)",
      };
      for (const property of themeProperties)
        style[property] = inheritedThemeValue(
          rootElement,
          sourceStyle,
          property,
        );

      const viewportWidth =
        viewportWindow.visualViewport?.width ?? viewportWindow.innerWidth;
      const viewportHeight =
        viewportWindow.visualViewport?.height ?? viewportWindow.innerHeight;
      if (viewportWidth <= 480) {
        style.bottom = 8;
        style.left = 8;
        style.maxHeight = Math.max(160, viewportHeight * 0.7);
        style.right = 8;
        style.top = "auto";
      } else {
        const anchor = triggerElement.getBoundingClientRect();
        const bounds = menuElement.getBoundingClientRect();
        const margin = 8;
        const gap = 6;
        const availableBelow = viewportHeight - anchor.bottom - gap - margin;
        const availableAbove = anchor.top - gap - margin;
        const placeAbove =
          bounds.height > availableBelow && availableAbove > availableBelow;
        const maxHeight = Math.max(
          120,
          placeAbove ? availableAbove : availableBelow,
        );
        const renderedHeight = Math.min(bounds.height, maxHeight);
        const width = Math.min(
          Math.max(bounds.width, anchor.width, 224),
          viewportWidth - margin * 2,
        );
        style.left = Math.min(
          viewportWidth - margin - width,
          Math.max(margin, anchor.left),
        );
        style.maxHeight = maxHeight;
        style.top = placeAbove
          ? Math.max(margin, anchor.top - gap - renderedHeight)
          : Math.min(
              anchor.bottom + gap,
              viewportHeight - margin - renderedHeight,
            );
        style.width = width;
      }
      setMenuStyle(style);
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
    setPortalContainer(
      preferredPortalTarget ?? triggerRef.current?.ownerDocument.body ?? null,
    );
    setMenuStyle(null);
    setActiveIndex(index);
    setOpen(true);
  }

  function closeAndFocusTrigger(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectPack(id: string): void {
    onSelect(id);
    closeAndFocusTrigger();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openAt(selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(packs.length - 1);
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    let destination: number | undefined;
    if (event.key === "ArrowDown") destination = (index + 1) % packs.length;
    if (event.key === "ArrowUp")
      destination = (index - 1 + packs.length) % packs.length;
    if (event.key === "Home") destination = 0;
    if (event.key === "End") destination = packs.length - 1;
    if (destination !== undefined) {
      event.preventDefault();
      setActiveIndex(destination);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeAndFocusTrigger();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const pack = packs[index];
      if (pack !== undefined) selectPack(pack.id);
    }
  }

  if (selectedPack === undefined) return null;
  return (
    <div className="mp-pack-selector" ref={rootRef}>
      <button
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Choose ${mediaLabel} pack, current ${selectedPack.name}`}
        className="mp-pack-trigger"
        onClick={() => (open ? closeAndFocusTrigger() : openAt(selectedIndex))}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="mp-pack-icon">
          {renderIcon(selectedPack)}
        </span>
        <span>Packs</span>
        <span aria-hidden="true" className="mp-pack-trigger__chevron">
          ▾
        </span>
      </button>
      {open && portalContainer !== null
        ? createPortal(
            <div
              aria-label={`${mediaLabel[0]?.toLocaleUpperCase()}${mediaLabel.slice(1)} packs`}
              className="mp-pack-menu"
              data-contextual-popover="pack"
              id={listboxId}
              ref={menuRef}
              role="listbox"
              style={
                menuStyle ?? {
                  left: 0,
                  position: "fixed",
                  top: 0,
                  visibility: "hidden",
                }
              }
            >
              {packs.map((pack, index) => {
                const selected = pack.id === selectedId;
                return (
                  <button
                    aria-selected={selected}
                    className="mp-pack-menu__option"
                    key={pack.id}
                    onClick={() => selectPack(pack.id)}
                    onFocus={() => setActiveIndex(index)}
                    onKeyDown={(event) => handleOptionKeyDown(event, index)}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    role="option"
                    tabIndex={index === activeIndex ? 0 : -1}
                    type="button"
                  >
                    <span aria-hidden="true" className="mp-pack-icon">
                      {renderIcon(pack)}
                    </span>
                    <span className="mp-pack-menu__name">{pack.name}</span>
                    <span aria-hidden="true" className="mp-pack-menu__check">
                      {selected ? "✓" : ""}
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

export type StickerPackSelectorProps = MediaPackSelectorProps<StickerPack>;

export function StickerPackSelector(props: StickerPackSelectorProps) {
  return <MediaPackSelector {...props} mediaLabel="sticker" />;
}

export type EmojiPackSelectorProps = MediaPackSelectorProps<EmojiPack>;

export function EmojiPackSelector(props: EmojiPackSelectorProps) {
  return <MediaPackSelector {...props} mediaLabel="emoji" />;
}
