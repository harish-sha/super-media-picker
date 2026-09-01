import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  EmojiPicker,
  GifPicker,
  MediaPicker,
  ReactionPicker,
  StickerPicker,
  type CompactReactionSource,
  type AnimationAutoplay,
  type MediaCapabilities,
  type MediaItem,
  type MediaPickerFeatures,
  type MediaPickerMode,
  type MediaPickerSize,
  type MediaPickerThemeMode,
  type PickerDisplayMode,
} from "super-media-picker";
import { useGifSearch } from "super-media-picker/headless";
import "super-media-picker/styles.css";

import {
  createMockProviders,
  customTabs,
  emojiPacks,
  type MockScenario,
} from "./mockMedia";
import "./playground.css";

type PreviewWidth = "desktop" | "mobile";
type SdkSurface =
  "media" | "emoji" | "gif" | "sticker" | "reaction" | "headless";

const initialFeatures: MediaPickerFeatures = {
  emoji: true,
  animatedEmoji: true,
  gifs: true,
  stickers: true,
  customMedia: true,
  recents: true,
  favorites: true,
};

type CapabilityPreset = "all" | "emoji-only" | "no-gif";

const capabilityPresets: Readonly<Record<CapabilityPreset, MediaCapabilities>> =
  {
    all: {
      emoji: true,
      animatedEmoji: true,
      gif: true,
      stickers: true,
      animatedStickers: true,
      customMedia: true,
      customEmoji: true,
      customStickers: true,
    },
    "emoji-only": { emoji: true, gif: false, stickers: false },
    "no-gif": {
      emoji: true,
      animatedEmoji: true,
      gif: false,
      stickers: true,
      animatedStickers: true,
      customMedia: true,
    },
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
  const [capabilityPreset, setCapabilityPreset] =
    useState<CapabilityPreset>("all");
  const [scenario, setScenario] = useState<MockScenario>("normal");
  const [autoplay, setAutoplay] = useState<AnimationAutoplay>("hover");
  const [surface, setSurface] = useState<SdkSurface>("media");
  const providers = useMemo(() => createMockProviders(scenario), [scenario]);

  function setFeature(
    feature: keyof MediaPickerFeatures,
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
          SDK surface
          <select
            onChange={(event) =>
              setSurface(event.currentTarget.value as SdkSurface)
            }
            value={surface}
          >
            <option value="media">MediaPicker</option>
            <option value="emoji">EmojiPicker</option>
            <option value="gif">GifPicker</option>
            <option value="sticker">StickerPicker</option>
            <option value="reaction">ReactionPicker</option>
            <option value="headless">Headless custom UI</option>
          </select>
        </label>
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
            <option value="fullscreen">Fullscreen</option>
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
            <option value="custom">Animated/custom</option>
          </select>
        </label>
        <label>
          Capabilities
          <select
            onChange={(event) =>
              setCapabilityPreset(event.currentTarget.value as CapabilityPreset)
            }
            value={capabilityPreset}
          >
            <option value="all">All media</option>
            <option value="emoji-only">Emoji only</option>
            <option value="no-gif">No GIF channel</option>
          </select>
        </label>
        <label>
          Mock network
          <select
            onChange={(event) =>
              setScenario(event.currentTarget.value as MockScenario)
            }
            value={scenario}
          >
            <option value="normal">Normal</option>
            <option value="delay">Slow</option>
            <option value="error">Error</option>
            <option value="empty">Empty</option>
          </select>
        </label>
        <label>
          Animation
          <select
            onChange={(event) =>
              setAutoplay(event.currentTarget.value as AnimationAutoplay)
            }
            value={autoplay}
          >
            <option value="hover">Hover/focus</option>
            <option value="visible">Visible</option>
            <option value="always">Always</option>
            <option value="never">Never</option>
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
        {(
          ["emoji", "animatedEmoji", "gifs", "stickers", "customMedia"] as const
        ).map((feature) => (
          <label className="playground-checkbox" key={feature}>
            <input
              checked={features[feature]}
              onChange={(event) =>
                setFeature(feature, event.currentTarget.checked)
              }
              type="checkbox"
            />
            {feature}
          </label>
        ))}
      </section>

      <section className="playground-demo" aria-label="Interactive demo">
        <div className="playground-preview" data-preview-width={previewWidth}>
          {surface === "media" ? (
            <MediaPicker
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              capabilities={capabilityPresets[capabilityPreset]}
              compact={{
                allowExpand,
                source: compactSource,
                ...(compactSource === "custom"
                  ? { reactions: emojiPacks[0]?.items ?? [] }
                  : {}),
              }}
              customTabs={customTabs}
              displayMode={displayMode}
              features={features}
              emojiPacks={emojiPacks}
              mode={mode}
              onModeChange={setMode}
              onSelect={setSelection}
              preview={{ enabled: true }}
              providers={providers}
              size={size}
              theme={theme}
            />
          ) : surface === "emoji" ? (
            <EmojiPicker
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              capabilities={capabilityPresets[capabilityPreset]}
              displayMode={displayMode}
              emojiPacks={emojiPacks}
              features={{
                animatedEmoji: features.animatedEmoji,
                favorites: features.favorites,
                recents: features.recents,
              }}
              onSelect={setSelection}
              size={size}
              theme={theme}
            />
          ) : surface === "gif" ? (
            <GifPicker
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              capabilities={capabilityPresets[capabilityPreset]}
              displayMode={displayMode}
              onSelect={setSelection}
              provider={providers.gifs}
              size={size}
              theme={theme}
            />
          ) : surface === "sticker" ? (
            <StickerPicker
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              capabilities={capabilityPresets[capabilityPreset]}
              displayMode={displayMode}
              onSelect={setSelection}
              provider={providers.stickers}
              size={size}
              theme={theme}
            />
          ) : surface === "reaction" ? (
            <ReactionPicker
              animatedMedia={{ autoplay, maxActiveAnimations: 3 }}
              displayMode={displayMode}
              onSelect={setSelection}
              {...(compactSource === "custom"
                ? { reactions: emojiPacks[0]?.items ?? [] }
                : {})}
              source={compactSource}
              theme={theme}
            />
          ) : (
            <HeadlessGifDemo
              onSelect={setSelection}
              provider={providers.gifs}
            />
          )}
        </div>
        <aside className="playground-output" aria-live="polite">
          <h2>Normalized selection</h2>
          <pre data-testid="selection-output">
            {selection === undefined
              ? "Select media to inspect its normalized MediaItem."
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

function HeadlessGifDemo({
  provider,
  onSelect,
}: {
  readonly provider: NonNullable<
    ReturnType<typeof createMockProviders>["gifs"]
  >;
  readonly onSelect: (item: MediaItem) => void;
}) {
  const gifs = useGifSearch({ provider });
  return (
    <section className="playground-headless" aria-label="Headless GIF picker">
      <label htmlFor="headless-search">Search GIFs</label>
      <input
        id="headless-search"
        onChange={(event) => gifs.search(event.currentTarget.value)}
        placeholder="Try party"
        value={gifs.query}
      />
      <p aria-live="polite">
        {gifs.loading
          ? "Loading…"
          : (gifs.error?.message ?? `${gifs.results.length} results`)}
      </p>
      <div className="playground-headless-grid">
        {gifs.results.map((item) => (
          <button key={item.id} onClick={() => onSelect(item)} type="button">
            <img
              alt=""
              height={96}
              src={item.previewUrl ?? item.url}
              width={96}
            />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      {gifs.hasMore ? (
        <button onClick={gifs.loadMore} type="button">
          Load more
        </button>
      ) : null}
    </section>
  );
}

const root = document.querySelector<HTMLDivElement>("#root");
if (root === null) throw new Error("Playground root element was not found.");

createRoot(root).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);
