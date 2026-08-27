import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import type { MediaItem } from "@company/media-core";
import { MediaPicker } from "@company/media-react";
import type { MediaPickerThemeMode } from "@company/media-themes";

import "./playground.css";

function Playground() {
  const [selection, setSelection] = useState<MediaItem>();
  const [theme, setTheme] = useState<MediaPickerThemeMode>("system");

  return (
    <main className="playground-shell">
      <header className="playground-intro">
        <p className="playground-eyebrow">@company/media-picker · Phase 2</p>
        <h1>Messaging media picker</h1>
        <p>Search, browse with the keyboard, and select any Unicode emoji.</p>
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
      </header>
      <section className="playground-demo" aria-label="Interactive demo">
        <MediaPicker onSelect={setSelection} theme={theme} />
        <aside className="playground-output" aria-live="polite">
          <h2>Normalized selection</h2>
          <pre data-testid="selection-output">
            {selection === undefined
              ? "Select an emoji to inspect its MediaItem."
              : JSON.stringify(selection, null, 2)}
          </pre>
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
