/**
 * Runtime loader for i18n translation strings sourced from Strapi.
 *
 * Returns the same nested object shape as the committed `src/locales/<lng>/<ns>.json`
 * files, so it plugs straight into `i18next-resources-to-backend`. Behaviour:
 *
 *  - If Strapi isn't configured (env vars unset), returns the bundled JSON —
 *    the app behaves exactly as before enabling Strapi.
 *  - If Strapi is configured but unreachable / errors / returns nothing, it
 *    falls back to the bundled JSON so the UI never renders empty.
 *
 * NOTE: intentionally NOT using `import "server-only"`. This module is reached
 * (statically) from `src/app/i18n.ts`, which is also imported by the client
 * `TranslationsProvider`; adding `server-only` would break the client build.
 * The loader only ever runs on the server (the client always receives resolved
 * `resources` as a prop), and STRAPI_API_TOKEN is a server-only env var, so the
 * token is never shipped to the browser.
 */

const STRAPI_URL = process.env.STRAPI_API_URL
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN

type FlatEntry = { key: string; value: string }

/** Assign `value` into `tree` at the dotted-path `segments` (creating objects). */
function setNested(
  tree: Record<string, unknown>,
  segments: string[],
  value: string,
): void {
  let node: Record<string, unknown> = tree
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i]
    if (typeof node[seg] !== "object" || node[seg] === null) {
      node[seg] = {}
    }
    node = node[seg] as Record<string, unknown>
  }
  node[segments[segments.length - 1]] = value
}

async function loadBundledFallback(language: string, namespace: string) {
  const mod = await import(`@/locales/${language}/${namespace}.json`)
  return mod.default
}

export async function loadNamespaceResources(
  language: string,
  namespace: string,
) {
  // Strapi not configured yet → behave exactly like the bundled setup.
  if (!STRAPI_URL || !STRAPI_TOKEN) {
    return loadBundledFallback(language, namespace)
  }

  try {
    const url =
      `${STRAPI_URL}/api/translations` +
      `?locale=${encodeURIComponent(language)}` +
      `&fields[0]=key&fields[1]=value` +
      `&pagination[pageSize]=2000`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      // Cached in Next's Data Cache under a tag; the Strapi publish webhook
      // busts it via revalidateTag("i18n"). `revalidate` is a time-based safety net.
      next: { tags: ["i18n", `i18n:${language}`], revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`Strapi responded ${res.status}`)

    const json = (await res.json()) as { data: FlatEntry[] }
    const tree: Record<string, unknown> = {}
    const entries = json.data ?? []
    entries.forEach((entry) => {
      if (
        entry &&
        typeof entry.key === "string" &&
        typeof entry.value === "string"
      ) {
        setNested(tree, entry.key.split("."), entry.value)
      }
    })
    if (Object.keys(tree).length === 0) {
      throw new Error("Strapi returned no translations")
    }
    return tree
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      `[i18n] Strapi load failed for "${language}", using bundled fallback:`,
      error,
    )
    return loadBundledFallback(language, namespace)
  }
}
