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
  readonly onChange: (category: EmojiPickerCategory) => void;
}

export function CategoryNavigation({
  activeCategory,
  onChange,
}: CategoryNavigationProps) {
  return (
    <nav aria-label="Emoji categories" className="mp-categories">
      <div className="mp-categories__list" role="tablist">
      {categories.map((category) => (
        <button
          aria-label={category}
          aria-controls="mp-emoji-panel"
          aria-selected={category === activeCategory}
          className="mp-category"
          id={`mp-category-${category.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`}
          key={category}
          onClick={() => onChange(category)}
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
  categories,
