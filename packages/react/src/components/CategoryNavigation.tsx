import { useRef, type KeyboardEvent } from "react";

import type { EmojiPickerCategory } from "@company/media-emoji";

const categorySymbols: Readonly<Record<EmojiPickerCategory, string>> = {
  Recent: "🕘",
  Favorites: "★",
  "Smileys & Emotion": "😀",
  "People & Body": "👋",
  "Animals & Nature": "🐻",
  "Food & Drink": "🍎",
  Activities: "⚽",
  "Travel & Places": "🚀",
  Objects: "💡",
  Symbols: "❤️",
  Flags: "🏁",
};

export interface CategoryNavigationProps {
  readonly categories: readonly EmojiPickerCategory[];
  readonly activeCategory: EmojiPickerCategory;
  readonly idPrefix: string;
  readonly panelId: string;
  readonly onChange: (category: EmojiPickerCategory) => void;
}

export function categoryTabId(
  idPrefix: string,
  category: EmojiPickerCategory,
): string {
  return `${idPrefix}-${category.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`;
}

export function CategoryNavigation({
  categories,
  activeCategory,
  idPrefix,
  panelId,
  onChange,
}: CategoryNavigationProps) {
  const buttonRefs = useRef(new Map<EmojiPickerCategory, HTMLButtonElement>());

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    category: EmojiPickerCategory,
  ): void {
    const index = categories.indexOf(category);
    const destinations: Partial<Record<string, number>> = {
      ArrowLeft: (index - 1 + categories.length) % categories.length,
      ArrowRight: (index + 1) % categories.length,
      End: categories.length - 1,
      Home: 0,
    };
    const destination = destinations[event.key];
    if (destination === undefined) return;
    const nextCategory = categories[destination];
    if (nextCategory === undefined) return;
    event.preventDefault();
    onChange(nextCategory);
    buttonRefs.current.get(nextCategory)?.focus();
  }

  return (
    <nav aria-label="Emoji categories" className="mp-categories">
      <div className="mp-categories__list" role="tablist">
        {categories.map((category) => (
          <button
            aria-controls={panelId}
            aria-label={category}
            aria-selected={category === activeCategory}
            className="mp-category"
            id={categoryTabId(idPrefix, category)}
            key={category}
            onClick={() => onChange(category)}
            onKeyDown={(event) => handleKeyDown(event, category)}
            ref={(element) => {
              if (element === null) buttonRefs.current.delete(category);
              else buttonRefs.current.set(category, element);
            }}
            role="tab"
            tabIndex={category === activeCategory ? 0 : -1}
            title={category}
            type="button"
          >
            <span aria-hidden="true">{categorySymbols[category]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
