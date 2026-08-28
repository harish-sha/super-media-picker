import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  MediaPicker,
  type CompactReactionSource,
  type MediaItem,
  type MediaPickerFeatures,
  type MediaPickerMode,
  type MediaPickerSize,
  type MediaPickerThemeMode,
  type PickerDisplayMode,
} from "super-media-picker";
import "super-media-picker/styles.css";

import "./playground.css";

type PreviewWidth = "desktop" | "mobile";

const initialFeatures: MediaPickerFeatures = {
  emoji: true,
  gifs: false,
  stickers: false,
  recents: true,
  favorites: true,
};

function Playground() {
  const [selection, setSelection] = useState<MediaItem>();
  const [mode, setMode] = useState<MediaPickerMode>("compact");
  const [size, setSize] = useState<MediaPickerSize>("md");
  const [theme, setTheme] = useState<MediaPickerThemeMode>("system");
  const [displayMode, setDisplayMode] = useState<PickerDisplayMode>("inline");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [compactSource, setCompactSource] =
    useState<CompactReactionSource>("default");
  const [allowExpand, setAllowExpand] = useState(true);
  const [features, setFeatures] = useState(initialFeatures);

  function setFeature(
    feature: "recents" | "favorites",
    enabled: boolean,
  ): void {
    setFeatures((current) => ({ ...current, [feature]: enabled }));
  }

  function showExample(example: "quick" | "frequent" | "full" | "mobile") {
    if (example === "quick") {
      setMode("compact");
      setCompactSource("default");
      setDisplayMode("inline");
      setPreviewWidth("desktop");
    } else if (example === "frequent") {
      setMode("compact");
      setCompactSource("frequent");
      setDisplayMode("inline");
    } else if (example === "full") {
      setMode("full");
      setDisplayMode("inline");
      setPreviewWidth("desktop");
    } else {
      setMode("compact");
      setDisplayMode("bottom-sheet");
      setPreviewWidth("mobile");
    }
  }

  return (
    <main className="playground-shell">
      <header className="playground-intro">
        <p className="playground-eyebrow">SUPER MEDIA PICKER</p>
        <h1>Compact reactions and full media</h1>
        <p>
          Start with a focused reaction bar, expand into the complete picker,
          and exercise persistence, responsive placement, themes, and keyboard
          navigation.
        </p>
      </header>

      <nav aria-label="Picker examples" className="playground-presets">
        <button onClick={() => showExample("quick")} type="button">
          Quick reactions
        </button>
        <button onClick={() => showExample("frequent")} type="button">
          Frequent reactions
        </button>
        <button onClick={() => showExample("full")} type="button">
          Full picker
        </button>
        <button onClick={() => showExample("mobile")} type="button">
          Mobile
        </button>
      </nav>

      <section aria-label="Playground controls" className="playground-controls">
        <label>
          Mode
          <select
            onChange={(event) =>
              setMode(event.currentTarget.value as MediaPickerMode)
            }
            value={mode}
          >
            <option value="compact">Compact</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label>
          Size
          <select
            onChange={(event) =>
              setSize(event.currentTarget.value as MediaPickerSize)
            }
            value={size}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
        <label>
          Theme
          <select
            onChange={(event) =>
              setTheme(event.currentTarget.value as MediaPickerThemeMode)
            }
            value={theme}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Display
          <select
            onChange={(event) =>
              setDisplayMode(event.currentTarget.value as PickerDisplayMode)
            }
            value={displayMode}
          >
            <option value="auto">Auto</option>
            <option value="inline">Inline</option>
            <option value="popover">Popover</option>
            <option value="modal">Modal</option>
            <option value="bottom-sheet">Bottom sheet</option>
          </select>
        </label>
        <label>
          Preview
          <select
            onChange={(event) =>
              setPreviewWidth(event.currentTarget.value as PreviewWidth)
            }
            value={previewWidth}
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile / embedded</option>
          </select>
        </label>
        <label>
          Reactions
          <select
            onChange={(event) =>
              setCompactSource(
                event.currentTarget.value as CompactReactionSource,
              )
            }
            value={compactSource}
          >
            <option value="default">Default</option>
            <option value="recent">Recent</option>
            <option value="frequent">Frequent</option>
            <option value="favorites">Favorites</option>
          </select>
        </label>
        <label className="playground-checkbox">
          <input
            checked={allowExpand}
            onChange={(event) => setAllowExpand(event.currentTarget.checked)}
            type="checkbox"
          />
          Allow expand
        </label>
        <label className="playground-checkbox">
          <input
            checked={features.recents}
            onChange={(event) =>
              setFeature("recents", event.currentTarget.checked)
            }
            type="checkbox"
          />
          Recents
        </label>
        <label className="playground-checkbox">
          <input
            checked={features.favorites}
            onChange={(event) =>
              setFeature("favorites", event.currentTarget.checked)
            }
            type="checkbox"
          />
          Favorites
        </label>
      </section>

      <section className="playground-demo" aria-label="Interactive demo">
        <div className="playground-preview" data-preview-width={previewWidth}>
          <MediaPicker
            compact={{
              allowCollapse: true,
              allowExpand,
              source: compactSource,
            }}
            displayMode={displayMode}
            features={features}
            mode={mode}
            onModeChange={setMode}
            onSelect={setSelection}
            preview={{ enabled: true }}
            size={size}
            theme={theme}
          />
        </div>
        <aside className="playground-output" aria-live="polite">
          <h2>Normalized selection</h2>
          <pre data-testid="selection-output">
            {selection === undefined
              ? "Select an emoji to inspect its MediaItem."
              : JSON.stringify(selection, null, 2)}
          </pre>
          <p>
            Compact selection uses the same MediaItem output. Recents,
            favorites, and skin tone persist across expansion and reloads.
          </p>
        </aside>
      </section>
    </main>
  );
}

const root = document.querySelector<HTMLDivElement>("#root");
if (root === null) throw new Error("Playground root element was not found.");

createRoot(root).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);
