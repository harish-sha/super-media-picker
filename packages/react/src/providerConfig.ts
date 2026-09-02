import type {
  CustomMediaProvider,
  EmojiProvider,
  ProviderRegistration,
} from "@super-media-picker/core";

import type { CustomMediaTab, MediaPickerProviders } from "./types";

interface ResolvedProviderConfiguration {
  readonly providers?: MediaPickerProviders;
  readonly customTabs: readonly CustomMediaTab[];
}

export function providerList<T>(
  registration: ProviderRegistration<T> | undefined,
): readonly T[] {
  if (registration === undefined) return [];
  return Array.isArray(registration)
    ? (registration as readonly T[])
    : [registration as T];
}

/** Normalizes additive BYO registrations into the beta.3 internal panel shape. */
export function resolveProviderConfiguration(
  providers: MediaPickerProviders | undefined,
  customTabs: readonly CustomMediaTab[],
): ResolvedProviderConfiguration {
  const emoji = uniqueById([
    ...(providers?.emoji ?? []),
    ...providerList(providers?.animatedEmoji),
  ]);
  const registeredCustom = providerList(providers?.custom);
  const resolvedCustomTabs = uniqueTabs([
    ...customTabs,
    ...registeredCustom.map(customProviderTab),
  ]);
  if (providers === undefined) return { customTabs: resolvedCustomTabs };
  return {
    providers: {
      ...providers,
      ...(emoji.length === 0 ? {} : { emoji }),
    },
    customTabs: resolvedCustomTabs,
  };
}

function customProviderTab(provider: CustomMediaProvider): CustomMediaTab {
  return {
    id: provider.id,
    label: provider.displayName ?? provider.id,
    provider,
  };
}

function uniqueById<T extends EmojiProvider>(
  providers: readonly T[],
): readonly T[] {
  const ids = new Set<string>();
  return providers.filter((provider) => {
    if (ids.has(provider.id)) return false;
    ids.add(provider.id);
    return true;
  });
}

function uniqueTabs(
  tabs: readonly CustomMediaTab[],
): readonly CustomMediaTab[] {
  const ids = new Set<string>();
  return tabs.filter((tab) => {
    if (ids.has(tab.id)) return false;
    ids.add(tab.id);
    return true;
  });
}
