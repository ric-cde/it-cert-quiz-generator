import { createContext, type ReactNode, use, useMemo } from 'react'
import { DEFAULT_FEATURES, type FeatureFlags, type FeatureKey, resolveFeatures } from '@shared/features'
import { useSettings } from './settings'

/**
 * Feature flags in the browser. Outside a provider, such as in a component test or before the
 * settings load, every flag has its default.
 */
const FeaturesContext = createContext<FeatureFlags>(DEFAULT_FEATURES)

/** Supplies the saved flags to the whole app. Sits inside the query client. */
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const flags = useMemo(() => resolveFeatures(settings.data?.features), [settings.data?.features])
  return <FeaturesContext value={flags}>{children}</FeaturesContext>
}

/**
 * Sets some flags for everything inside it, whatever is saved. The gallery uses it to show every
 * component in full, and tests to try a flag off.
 */
export function FeatureOverride({ flags, children }: { flags: Partial<FeatureFlags>; children: ReactNode }) {
  const parent = use(FeaturesContext)
  const merged = useMemo(() => ({ ...parent, ...flags }), [parent, flags])
  return <FeaturesContext value={merged}>{children}</FeaturesContext>
}

export function useFeatures(): FeatureFlags {
  return use(FeaturesContext)
}

export function useFeature(key: FeatureKey): boolean {
  return use(FeaturesContext)[key]
}
