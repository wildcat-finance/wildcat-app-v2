"use client"

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  applyColorMode,
  COLOR_MODE_STORAGE_KEY,
  ColorMode,
  getSystemColorMode,
  isColorMode,
} from "@/theme/colorMode"

type ThemeModeContextValue = {
  mode: ColorMode
  toggleMode: () => void
  setMode: (mode: ColorMode) => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

const getInitialMode = (): ColorMode => {
  if (typeof window === "undefined") return "light"

  const storedMode = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)
  if (isColorMode(storedMode)) return storedMode

  const documentMode = document.documentElement.dataset.theme ?? null
  if (isColorMode(documentMode)) return documentMode

  return getSystemColorMode()
}

export const ThemeModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ColorMode>(getInitialMode)

  useEffect(() => {
    applyColorMode(mode)
  }, [mode])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleSystemModeChange = (event: MediaQueryListEvent) => {
      if (isColorMode(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY))) {
        return
      }

      setModeState(event.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleSystemModeChange)

    return () => {
      mediaQuery.removeEventListener("change", handleSystemModeChange)
    }
  }, [])

  const setMode = useCallback((nextMode: ColorMode) => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextMode)
    setModeState(nextMode)
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark")
  }, [mode, setMode])

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  )

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  )
}

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext)

  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider")
  }

  return context
}
