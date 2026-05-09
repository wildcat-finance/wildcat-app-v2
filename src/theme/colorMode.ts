export const COLOR_MODE_STORAGE_KEY = "wildcat-color-mode"

export type ColorMode = "light" | "dark"

export const isColorMode = (value: string | null): value is ColorMode =>
  value === "light" || value === "dark"

export const getSystemColorMode = () => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark"
  }

  return "light"
}

export const applyColorMode = (mode: ColorMode) => {
  if (typeof document === "undefined") return

  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
}
