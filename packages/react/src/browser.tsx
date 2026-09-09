import { Component, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  LocalStorageAdapter,
  type AnimatedMediaConfig,
  type EmojiPack,
  type MediaCapabilities,
  type MediaItem,
  type MediaPickerFeatures,
  type MediaPickerMode,
  type MediaPickerSize,
  type MediaUrlPolicy,
  type PickerDisplayMode,
  type SkinTone,
  type StorageAdapter,
} from "@super-media-picker/core";
import type { EmojiPickerCategory } from "@super-media-picker/emoji";
import type { MediaPickerTheme } from "@super-media-picker/themes";

import { MediaPicker } from "./components/MediaPicker";
import { MediaPickerPortalProvider } from "./portalTarget";
import type {
  MediaPickerDimensions,
  MediaPickerDraggableConfig,
  MediaPickerMotion,
  MediaPickerMotionPreset,
  MediaPickerPlacement,
  MediaPickerProviders,
  MediaPickerResizableConfig,
  MediaPickerSwipeToDismissConfig,
} from "./types";

export const SUPER_MEDIA_PICKER_TAG = "super-media-picker";

const themes = new Set<"light" | "dark" | "system">([
  "light",
  "dark",
  "system",
]);
const modes = new Set<MediaPickerMode>(["compact", "full"]);
const sizes = new Set<MediaPickerSize>(["sm", "md", "lg"]);
const displayModes = new Set<PickerDisplayMode>([
  "auto",
  "inline",
  "popover",
  "modal",
  "bottom-sheet",
  "fullscreen",
]);
const placements = new Set<MediaPickerPlacement>([
  "auto",
  "top",
  "top-start",
  "top-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "right",
]);
const motionPresets = new Set<MediaPickerMotionPreset>([
  "none",
  "fade",
  "scale",
  "pop",
  "slide-up",
  "slide-down",
  "zoom",
  "spring",
  "genie",
]);

let browserAssetBaseUrl: string | undefined;
const storageAdapters = new Map<string, StorageAdapter>();

/** @internal Configured by deterministic browser entry files. */
export function configureBrowserAssetBase(moduleUrl: string): void {
  try {
    browserAssetBaseUrl = new URL("./", moduleUrl).href;
  } catch {
    browserAssetBaseUrl = undefined;
  }
}

function storageForNamespace(namespace: string): StorageAdapter {
  const existing = storageAdapters.get(namespace);
  if (existing !== undefined) return existing;
  const storage = new LocalStorageAdapter(namespace);
  storageAdapters.set(namespace, storage);
  return storage;
}

export interface SuperMediaPickerInteractions {
  readonly draggable?: boolean | MediaPickerDraggableConfig;
  readonly resizable?: boolean | MediaPickerResizableConfig;
  readonly swipeToDismiss?: boolean | MediaPickerSwipeToDismissConfig;
}

export interface SuperMediaPickerPresentationDetail {
  readonly open: boolean;
  readonly mode: MediaPickerMode;
  readonly placement: Exclude<MediaPickerPlacement, "auto">;
}

export interface SuperMediaPickerErrorDetail {
  readonly error: unknown;
  readonly source: "provider" | "render" | "stylesheet";
}
export interface SuperMediaPickerEventMap {
  readonly "media-select": MediaItem;
  readonly "picker-open": SuperMediaPickerPresentationDetail;
  readonly "picker-close": SuperMediaPickerPresentationDetail;
  readonly "presentation-change": SuperMediaPickerPresentationDetail;
  readonly error: SuperMediaPickerErrorDetail;
}
export type SuperMediaPickerEvent<K extends keyof SuperMediaPickerEventMap> =
  CustomEvent<SuperMediaPickerEventMap[K]>;

export interface SuperMediaPickerOptions {
  readonly target?: string | Element | ShadowRoot;
  readonly open?: boolean;
  readonly theme?: MediaPickerTheme;
  readonly mode?: MediaPickerMode;
  readonly size?: MediaPickerSize;
  readonly displayMode?: PickerDisplayMode;
  readonly motion?: MediaPickerMotion;
  readonly placement?: MediaPickerPlacement;
  readonly dimensions?: MediaPickerDimensions;
  readonly interactions?: SuperMediaPickerInteractions;
  readonly providers?: MediaPickerProviders;
  readonly features?: Partial<MediaPickerFeatures>;
  readonly capabilities?: Partial<MediaCapabilities>;
  readonly storage?: StorageAdapter;
  readonly storageNamespace?: string;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly emojiPacks?: readonly EmojiPack[];
  readonly animatedMedia?: AnimatedMediaConfig;
  readonly allowExpand?: boolean;
  readonly defaultCategory?: EmojiPickerCategory;
  readonly defaultMediaType?: "emoji" | "gif" | "stickers" | "custom";
  readonly defaultSearchQuery?: string;
  readonly defaultSkinTone?: SkinTone;
  readonly maxUnicodeVersion?: number;
  readonly projectKey?: string;
  readonly stylesheetUrl?: string;
  readonly onSelect?: (item: MediaItem) => void;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
  readonly onPresentationChange?: (
    detail: SuperMediaPickerPresentationDetail,
  ) => void;
  readonly onError?: (detail: SuperMediaPickerErrorDetail) => void;
}

export interface SuperMediaPickerController {
  readonly element: SuperMediaPickerElement;
  open(): void;
  close(): void;
  update(options: Omit<SuperMediaPickerOptions, "target">): void;
  destroy(): void;
}

interface RuntimeConfiguration {
  readonly theme: MediaPickerTheme;
  readonly mode: MediaPickerMode;
  readonly size: MediaPickerSize;
  readonly displayMode: PickerDisplayMode;
  readonly motion: MediaPickerMotion;
  readonly placement: MediaPickerPlacement;
  readonly dimensions?: MediaPickerDimensions;
  readonly interactions?: SuperMediaPickerInteractions;
  readonly providers?: MediaPickerProviders;
  readonly features?: Partial<MediaPickerFeatures>;
  readonly capabilities?: Partial<MediaCapabilities>;
  readonly storage: StorageAdapter;
  readonly mediaSecurity?: MediaUrlPolicy;
  readonly emojiPacks?: readonly EmojiPack[];
  readonly animatedMedia?: AnimatedMediaConfig;
  readonly allowExpand: boolean;
  readonly defaultCategory?: EmojiPickerCategory;
  readonly defaultMediaType?: "emoji" | "gif" | "stickers" | "custom";
  readonly defaultSearchQuery?: string;
  readonly defaultSkinTone?: SkinTone;
  readonly maxUnicodeVersion?: number;
}

interface BoundaryProps {
  readonly children: ReactNode;
  readonly onError: (error: unknown) => void;
  readonly resetKey: number;
}

interface BoundaryState {
  readonly error?: unknown;
}

class BrowserErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = {};

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  override componentDidCatch(error: unknown): void {
    this.props.onError(error);
  }

  override componentDidUpdate(previous: BoundaryProps): void {
    if (
      this.state.error !== undefined &&
      previous.resetKey !== this.props.resetKey
    )
      this.setState({});
  }

  override render() {
    if (this.state.error !== undefined)
      return (
        <div className="mp-browser-error" role="alert">
          The media picker could not be rendered.
        </div>
      );
    return this.props.children;
  }
}

interface RuntimeProps {
  readonly configuration: RuntimeConfiguration;
  readonly onClose: () => void;
  readonly onRenderError: (error: unknown) => void;
  readonly onProviderError: (error: unknown) => void;
  readonly onModeChange: (mode: MediaPickerMode) => void;
  readonly onPlacementChange: (
    placement: Exclude<MediaPickerPlacement, "auto">,
  ) => void;
  readonly onSelect: (item: MediaItem) => void;
  readonly overlayRoot: HTMLElement;
  readonly resetKey: number;
}

function BrowserPickerRuntime({
  configuration,
  onClose,
  onRenderError,
  onProviderError,
  onModeChange,
  onPlacementChange,
  onSelect,
  overlayRoot,
  resetKey,
}: RuntimeProps) {
  const interactions = configuration.interactions;
  return (
    <BrowserErrorBoundary onError={onRenderError} resetKey={resetKey}>
      <MediaPickerPortalProvider target={overlayRoot}>
        <MediaPicker
          allowExpand={configuration.allowExpand}
          analytics={{
            track(event, payload) {
              if (event === "provider_error")
                onProviderError({ event, ...(payload ?? {}) });
            },
          }}
          displayMode={configuration.displayMode}
          mode={configuration.mode}
          motion={configuration.motion}
          onClose={onClose}
          onModeChange={onModeChange}
          onResolvedPlacementChange={onPlacementChange}
          onSelect={onSelect}
          placement={configuration.placement}
          portal={overlayRoot}
          size={configuration.size}
          storage={configuration.storage}
          theme={configuration.theme}
          {...(configuration.dimensions === undefined
            ? {}
            : { dimensions: configuration.dimensions })}
          {...(interactions?.draggable === undefined
            ? {}
            : { draggable: interactions.draggable })}
          {...(interactions?.resizable === undefined
            ? {}
            : { resizable: interactions.resizable })}
          {...(interactions?.swipeToDismiss === undefined
            ? {}
            : { swipeToDismiss: interactions.swipeToDismiss })}
          {...(configuration.providers === undefined
            ? {}
            : { providers: configuration.providers })}
          {...(configuration.features === undefined
            ? {}
            : { features: configuration.features })}
          {...(configuration.capabilities === undefined
            ? {}
            : { capabilities: configuration.capabilities })}
          {...(configuration.mediaSecurity === undefined
            ? {}
            : { mediaSecurity: configuration.mediaSecurity })}
          {...(configuration.emojiPacks === undefined
            ? {}
            : { emojiPacks: configuration.emojiPacks })}
          {...(configuration.animatedMedia === undefined
            ? {}
            : { animatedMedia: configuration.animatedMedia })}
          {...(configuration.defaultCategory === undefined
            ? {}
            : { defaultCategory: configuration.defaultCategory })}
          {...(configuration.defaultMediaType === undefined
            ? {}
            : { defaultMediaType: configuration.defaultMediaType })}
          {...(configuration.defaultSearchQuery === undefined
            ? {}
            : { defaultSearchQuery: configuration.defaultSearchQuery })}
          {...(configuration.defaultSkinTone === undefined
            ? {}
            : { defaultSkinTone: configuration.defaultSkinTone })}
          {...(configuration.maxUnicodeVersion === undefined
            ? {}
            : { maxUnicodeVersion: configuration.maxUnicodeVersion })}
        />
      </MediaPickerPortalProvider>
    </BrowserErrorBoundary>
  );
}

const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement === "undefined"
    ? (class {} as unknown as typeof HTMLElement)
    : HTMLElement;

type ComplexPropertyName =
  | "theme"
  | "motion"
  | "dimensions"
  | "interactions"
  | "providers"
  | "features"
  | "capabilities"
  | "storage"
  | "mediaSecurity"
  | "emojiPacks"
  | "animatedMedia"
  | "defaultCategory"
  | "defaultMediaType"
  | "defaultSearchQuery"
  | "defaultSkinTone"
  | "maxUnicodeVersion"
  | "projectKey"
  | "stylesheetUrl";

export class SuperMediaPickerElement extends HTMLElementBase {
  static readonly observedAttributes = [
    "theme",
    "mode",
    "size",
    "display-mode",
    "motion",
    "placement",
    "width",
    "height",
    "allow-expand",
    "storage-namespace",
    "stylesheet-url",
  ];

  #root: Root | undefined;
  #mount: HTMLDivElement | undefined;
  #overlayRoot: HTMLDivElement | undefined;
  #stylesheet: HTMLLinkElement | undefined;
  #connected = false;
  #visible = true;
  #batching = false;
  #runtimeMode: MediaPickerMode | undefined;
  #resolvedPlacement: Exclude<MediaPickerPlacement, "auto"> = "bottom-start";
  #properties: Partial<Record<ComplexPropertyName, unknown>> = {};
  #callbacks: {
    onSelect?: (item: MediaItem) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onPresentationChange?: (detail: SuperMediaPickerPresentationDetail) => void;
    onError?: (detail: SuperMediaPickerErrorDetail) => void;
  } = {};
  #resetKey = 0;

  connectedCallback(): void {
    this.#connected = true;
    this.#ensureShadowRoot();
    this.#render();
    if (this.#visible) queueMicrotask(() => this.#emitOpen());
  }

  disconnectedCallback(): void {
    this.#connected = false;
    this.#root?.unmount();
    this.#root = undefined;
  }

  attributeChangedCallback(name: string): void {
    if (name === "mode") this.#runtimeMode = undefined;
    if (name === "stylesheet-url") this.#syncStylesheet();
    this.#requestRender();
    if (["mode", "display-mode", "placement"].includes(name) && this.#connected)
      this.#emitPresentation();
  }

  get isOpen(): boolean {
    return this.#visible;
  }

  get theme(): MediaPickerTheme {
    return (
      (this.#properties.theme as MediaPickerTheme | undefined) ??
      this.#attributeChoice("theme", themes) ??
      "system"
    );
  }

  set theme(value: MediaPickerTheme) {
    this.#setProperty("theme", value);
  }

  get mode(): MediaPickerMode {
    return this.#runtimeMode ?? this.#attributeChoice("mode", modes) ?? "full";
  }

  set mode(value: MediaPickerMode) {
    this.#runtimeMode = value;
    this.#requestRender();
    this.#emitPresentation();
  }

  get size(): MediaPickerSize {
    return this.#attributeChoice("size", sizes) ?? "md";
  }

  set size(value: MediaPickerSize) {
    this.setAttribute("size", value);
  }

  get displayMode(): PickerDisplayMode {
    return this.#attributeChoice("display-mode", displayModes) ?? "auto";
  }

  set displayMode(value: PickerDisplayMode) {
    this.setAttribute("display-mode", value);
  }

  get placement(): MediaPickerPlacement {
    return this.#attributeChoice("placement", placements) ?? "auto";
  }

  set placement(value: MediaPickerPlacement) {
    this.setAttribute("placement", value);
  }

  get allowExpand(): boolean {
    return this.hasAttribute("allow-expand");
  }

  set allowExpand(value: boolean) {
    this.toggleAttribute("allow-expand", value);
  }

  get motion(): MediaPickerMotion {
    return (
      (this.#properties.motion as MediaPickerMotion | undefined) ??
      this.#attributeChoice("motion", motionPresets) ??
      "pop"
    );
  }

  set motion(value: MediaPickerMotion) {
    this.#setProperty("motion", value);
  }

  get dimensions(): MediaPickerDimensions | undefined {
    const configured = this.#properties.dimensions as
      MediaPickerDimensions | undefined;
    if (configured !== undefined) return configured;
    const width = this.getAttribute("width") ?? undefined;
    const height = this.getAttribute("height") ?? undefined;
    return width === undefined && height === undefined
      ? undefined
      : {
          ...(width === undefined ? {} : { width: this.#dimension(width) }),
          ...(height === undefined ? {} : { height: this.#dimension(height) }),
        };
  }

  set dimensions(value: MediaPickerDimensions) {
    this.#setProperty("dimensions", value);
  }

  get interactions(): SuperMediaPickerInteractions | undefined {
    return this.#properties.interactions as
      SuperMediaPickerInteractions | undefined;
  }

  set interactions(value: SuperMediaPickerInteractions) {
    this.#setProperty("interactions", value);
  }

  get providers(): MediaPickerProviders | undefined {
    return this.#properties.providers as MediaPickerProviders | undefined;
  }

  set providers(value: MediaPickerProviders) {
    this.#setProperty("providers", value);
  }

  get features(): Partial<MediaPickerFeatures> | undefined {
    return this.#properties.features as
      Partial<MediaPickerFeatures> | undefined;
  }

  set features(value: Partial<MediaPickerFeatures>) {
    this.#setProperty("features", value);
  }

  get capabilities(): Partial<MediaCapabilities> | undefined {
    return this.#properties.capabilities as
      Partial<MediaCapabilities> | undefined;
  }

  set capabilities(value: Partial<MediaCapabilities>) {
    this.#setProperty("capabilities", value);
  }

  get storage(): StorageAdapter | undefined {
    return this.#properties.storage as StorageAdapter | undefined;
  }

  set storage(value: StorageAdapter) {
    this.#setProperty("storage", value);
  }

  get storageNamespace(): string {
    return this.getAttribute("storage-namespace")?.trim() || "media-picker";
  }

  set storageNamespace(value: string) {
    if (value === undefined) this.removeAttribute("storage-namespace");
    else this.setAttribute("storage-namespace", value);
  }

  get mediaSecurity(): MediaUrlPolicy | undefined {
    return this.#properties.mediaSecurity as MediaUrlPolicy | undefined;
  }

  set mediaSecurity(value: MediaUrlPolicy) {
    this.#setProperty("mediaSecurity", value);
  }

  get emojiPacks(): readonly EmojiPack[] | undefined {
    return this.#properties.emojiPacks as readonly EmojiPack[] | undefined;
  }

  set emojiPacks(value: readonly EmojiPack[]) {
    this.#setProperty("emojiPacks", value);
  }

  get animatedMedia(): AnimatedMediaConfig | undefined {
    return this.#properties.animatedMedia as AnimatedMediaConfig | undefined;
  }

  set animatedMedia(value: AnimatedMediaConfig) {
    this.#setProperty("animatedMedia", value);
  }

  get defaultCategory(): EmojiPickerCategory | undefined {
    return this.#properties.defaultCategory as EmojiPickerCategory | undefined;
  }

  set defaultCategory(value: EmojiPickerCategory) {
    this.#setProperty("defaultCategory", value);
  }

  get defaultMediaType(): "emoji" | "gif" | "stickers" | "custom" | undefined {
    return this.#properties.defaultMediaType as
      "emoji" | "gif" | "stickers" | "custom" | undefined;
  }

  set defaultMediaType(value: "emoji" | "gif" | "stickers" | "custom") {
    this.#setProperty("defaultMediaType", value);
  }

  get defaultSearchQuery(): string | undefined {
    return this.#properties.defaultSearchQuery as string | undefined;
  }

  set defaultSearchQuery(value: string) {
    this.#setProperty("defaultSearchQuery", value);
  }

  get defaultSkinTone(): SkinTone | undefined {
    return this.#properties.defaultSkinTone as SkinTone | undefined;
  }

  set defaultSkinTone(value: SkinTone) {
    this.#setProperty("defaultSkinTone", value);
  }

  get maxUnicodeVersion(): number | undefined {
    return this.#properties.maxUnicodeVersion as number | undefined;
  }

  set maxUnicodeVersion(value: number) {
    this.#setProperty("maxUnicodeVersion", value);
  }

  get projectKey(): string | undefined {
    return this.#properties.projectKey as string | undefined;
  }

  set projectKey(value: string) {
    this.#setProperty("projectKey", value);
  }

  get stylesheetUrl(): string | undefined {
    return (
      (this.#properties.stylesheetUrl as string | undefined) ??
      this.getAttribute("stylesheet-url") ??
      (browserAssetBaseUrl === undefined
        ? undefined
        : new URL("styles.css", browserAssetBaseUrl).href)
    );
  }

  set stylesheetUrl(value: string) {
    this.#setProperty("stylesheetUrl", value);
    this.#syncStylesheet();
  }

  open(): void {
    if (this.#visible) return;
    this.#visible = true;
    this.#render();
    queueMicrotask(() => this.#emitOpen());
  }

  close(): void {
    if (!this.#visible) return;
    this.#visible = false;
    this.#root?.render(null);
    this.#emitClose();
  }

  update(options: Omit<SuperMediaPickerOptions, "target">): void {
    const wasOpen = this.#visible;
    this.#batching = true;
    try {
      this.#applyOptions(options);
      if (options.open !== undefined) this.#visible = options.open;
    } finally {
      this.#batching = false;
    }
    this.#resetKey += 1;
    this.#render();
    if (!this.#connected || wasOpen === this.#visible) return;
    if (this.#visible) queueMicrotask(() => this.#emitOpen());
    else this.#emitClose();
  }

  destroy(): void {
    this.close();
    this.remove();
  }

  #applyOptions(options: Omit<SuperMediaPickerOptions, "target">): void {
    if ("theme" in options) this.theme = options.theme;
    if ("mode" in options) this.mode = options.mode;
    if ("motion" in options) this.motion = options.motion;
    if ("dimensions" in options) this.dimensions = options.dimensions;
    if ("interactions" in options) this.interactions = options.interactions;
    if ("providers" in options) this.providers = options.providers;
    if ("features" in options) this.features = options.features;
    if ("capabilities" in options) this.capabilities = options.capabilities;
    if ("storage" in options) this.storage = options.storage;
    if ("storageNamespace" in options)
      this.storageNamespace = options.storageNamespace;
    if ("mediaSecurity" in options) this.mediaSecurity = options.mediaSecurity;
    if ("emojiPacks" in options) this.emojiPacks = options.emojiPacks;
    if ("animatedMedia" in options) this.animatedMedia = options.animatedMedia;
    if ("defaultCategory" in options)
      this.#setProperty("defaultCategory", options.defaultCategory);
    if ("defaultMediaType" in options)
      this.#setProperty("defaultMediaType", options.defaultMediaType);
    if ("defaultSearchQuery" in options)
      this.#setProperty("defaultSearchQuery", options.defaultSearchQuery);
    if ("defaultSkinTone" in options)
      this.#setProperty("defaultSkinTone", options.defaultSkinTone);
    if ("maxUnicodeVersion" in options)
      this.#setProperty("maxUnicodeVersion", options.maxUnicodeVersion);
    if ("projectKey" in options)
      this.#setProperty("projectKey", options.projectKey);
    if ("stylesheetUrl" in options)
      this.#setProperty("stylesheetUrl", options.stylesheetUrl);
    if ("size" in options && options.size !== undefined)
      this.size = options.size;
    if ("displayMode" in options && options.displayMode !== undefined)
      this.displayMode = options.displayMode;
    if ("placement" in options && options.placement !== undefined)
      this.placement = options.placement;
    if ("allowExpand" in options && options.allowExpand !== undefined)
      this.allowExpand = options.allowExpand;
    for (const callback of [
      "onSelect",
      "onOpen",
      "onClose",
      "onPresentationChange",
      "onError",
    ] as const)
      if (callback in options) {
        const value = options[callback];
        if (value === undefined) delete this.#callbacks[callback];
        else this.#callbacks[callback] = value as never;
      }
  }

  #configuration(): RuntimeConfiguration {
    const storage =
      (this.#properties.storage as StorageAdapter | undefined) ??
      storageForNamespace(this.storageNamespace);
    return {
      theme: this.theme,
      mode: this.mode,
      size: this.size,
      displayMode: this.displayMode,
      motion: this.motion,
      placement: this.placement,
      storage,
      allowExpand: this.allowExpand,
      ...(this.dimensions === undefined ? {} : { dimensions: this.dimensions }),
      ...(this.interactions === undefined
        ? {}
        : { interactions: this.interactions }),
      ...(this.providers === undefined ? {} : { providers: this.providers }),
      ...(this.features === undefined ? {} : { features: this.features }),
      ...(this.capabilities === undefined
        ? {}
        : { capabilities: this.capabilities }),
      ...(this.mediaSecurity === undefined
        ? {}
        : { mediaSecurity: this.mediaSecurity }),
      ...(this.emojiPacks === undefined ? {} : { emojiPacks: this.emojiPacks }),
      ...(this.animatedMedia === undefined
        ? {}
        : { animatedMedia: this.animatedMedia }),
      ...(this.defaultCategory === undefined
        ? {}
        : { defaultCategory: this.defaultCategory }),
      ...(this.defaultMediaType === undefined
        ? {}
        : { defaultMediaType: this.defaultMediaType }),
      ...(this.defaultSearchQuery === undefined
        ? {}
        : { defaultSearchQuery: this.defaultSearchQuery }),
      ...(this.defaultSkinTone === undefined
        ? {}
        : { defaultSkinTone: this.defaultSkinTone }),
      ...(this.maxUnicodeVersion === undefined
        ? {}
        : { maxUnicodeVersion: this.maxUnicodeVersion }),
    };
  }

  #ensureShadowRoot(): void {
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    const ownerDocument = this.ownerDocument;
    let stylesheet = shadow.querySelector<HTMLLinkElement>(
      "link[data-smp-styles]",
    );
    if (stylesheet === null) {
      stylesheet = ownerDocument.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.dataset.smpStyles = "";
      stylesheet.addEventListener("error", () =>
        this.#emitError(
          "stylesheet",
          new Error("Picker stylesheet failed to load"),
        ),
      );
      shadow.append(stylesheet);
    }
    this.#stylesheet = stylesheet;
    let mount = shadow.querySelector<HTMLDivElement>("[data-smp-mount]");
    if (mount === null) {
      mount = ownerDocument.createElement("div");
      mount.dataset.smpMount = "";
      mount.setAttribute("part", "application");
      shadow.append(mount);
    }
    this.#mount = mount;
    let overlayRoot =
      shadow.querySelector<HTMLDivElement>("[data-smp-overlay]");
    if (overlayRoot === null) {
      overlayRoot = ownerDocument.createElement("div");
      overlayRoot.dataset.smpOverlay = "";
      overlayRoot.setAttribute("part", "overlay");
      shadow.append(overlayRoot);
    }
    this.#overlayRoot = overlayRoot;
    this.#syncStylesheet();
    this.#root ??= createRoot(this.#mount);
  }

  #syncStylesheet(): void {
    if (this.#stylesheet === undefined) return;
    const url = this.stylesheetUrl;
    if (url === undefined) this.#stylesheet.removeAttribute("href");
    else if (this.#stylesheet.href !== url) this.#stylesheet.href = url;
  }

  #render(): void {
    if (!this.#connected) return;
    this.#ensureShadowRoot();
    if (!this.#visible) {
      this.#root?.render(null);
      return;
    }
    const overlayRoot = this.#overlayRoot;
    if (overlayRoot === undefined) return;
    this.#root?.render(
      <BrowserPickerRuntime
        configuration={this.#configuration()}
        onClose={() => this.close()}
        onProviderError={(error) => this.#emitError("provider", error)}
        onRenderError={(error) => this.#emitError("render", error)}
        onModeChange={(mode) => {
          this.#runtimeMode = mode;
          this.#render();
          this.#emitPresentation();
        }}
        onPlacementChange={(placement) => {
          this.#resolvedPlacement = placement;
          this.#emitPresentation();
        }}
        onSelect={(item) => {
          this.#dispatch("media-select", item);
          this.#callbacks.onSelect?.(item);
        }}
        overlayRoot={overlayRoot}
        resetKey={this.#resetKey}
      />,
    );
  }

  #setProperty(name: ComplexPropertyName, value: unknown): void {
    if (value === undefined) delete this.#properties[name];
    else this.#properties[name] = value;
    this.#requestRender();
  }

  #requestRender(): void {
    if (!this.#batching) this.#render();
  }

  #attributeChoice<T extends string>(
    name: string,
    choices: ReadonlySet<T>,
  ): T | undefined {
    const value = this.getAttribute(name);
    return value !== null && choices.has(value as T) ? (value as T) : undefined;
  }

  #dimension(value: string): number | string {
    const number = Number(value);
    return value.trim() !== "" && Number.isFinite(number) ? number : value;
  }

  #emitOpen(): void {
    if (!this.#connected || !this.#visible) return;
    this.#dispatch("picker-open", {
      mode: this.mode,
      open: true,
      placement: this.#resolvedPlacement,
    });
    this.#callbacks.onOpen?.();
  }

  #emitClose(): void {
    this.#dispatch("picker-close", {
      mode: this.mode,
      open: false,
      placement: this.#resolvedPlacement,
    });
    this.#callbacks.onClose?.();
  }

  #emitPresentation(): void {
    if (!this.#connected) return;
    const detail = {
      mode: this.mode,
      open: this.#visible,
      placement: this.#resolvedPlacement,
    };
    this.#dispatch("presentation-change", detail);
    this.#callbacks.onPresentationChange?.(detail);
  }

  #emitError(
    source: SuperMediaPickerErrorDetail["source"],
    error: unknown,
  ): void {
    const detail = { error, source };
    this.#dispatch("error", detail);
    this.#callbacks.onError?.(detail);
  }

  #dispatch<T>(name: string, detail: T): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail,
      }),
    );
  }
}

export function defineSuperMediaPicker(
  registry: CustomElementRegistry | undefined = typeof customElements ===
  "undefined"
    ? undefined
    : customElements,
): typeof SuperMediaPickerElement {
  if (
    registry !== undefined &&
    registry.get(SUPER_MEDIA_PICKER_TAG) === undefined
  )
    registry.define(SUPER_MEDIA_PICKER_TAG, SuperMediaPickerElement);
  return SuperMediaPickerElement;
}

function resolveTarget(
  target: SuperMediaPickerOptions["target"],
): Element | ShadowRoot {
  if (typeof document === "undefined")
    throw new Error("Super Media Picker requires a browser document.");
  if (typeof target === "string") {
    const element = document.querySelector(target);
    if (element === null)
      throw new Error(`Super Media Picker target not found: ${target}`);
    return element;
  }
  return target ?? document.body;
}

export function createSuperMediaPicker(
  options: SuperMediaPickerOptions = {},
): SuperMediaPickerController {
  defineSuperMediaPicker();
  const element = document.createElement(SUPER_MEDIA_PICKER_TAG);
  const { target, ...configuration } = options;
  element.update(configuration);
  resolveTarget(target).append(element);
  return {
    element,
    open: () => element.open(),
    close: () => element.close(),
    update: (next) => element.update(next),
    destroy: () => element.destroy(),
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "super-media-picker": SuperMediaPickerElement;
  }
}
