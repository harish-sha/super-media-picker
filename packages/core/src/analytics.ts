export type MediaPickerAnalyticsEvent =
  | "picker_opened"
  | "picker_closed"
  | "tab_changed"
  | "search_started"
  | "search_completed"
  | "emoji_selected"
  | "gif_selected"
  | "sticker_selected"
  | "favorite_added"
  | "favorite_removed"
  | "load_more"
  | "provider_error";

export interface MediaPickerAnalytics {
  track(
    event: MediaPickerAnalyticsEvent,
    properties?: Readonly<Record<string, unknown>>,
  ): void;
}

export const noOpAnalytics: MediaPickerAnalytics = Object.freeze({
  track: () => undefined,
});
