export {}

export type HotjarFn = {
  (...args: unknown[]): void
  q?: unknown[][]
}

declare global {
  interface Window {
    hj?: HotjarFn
    _hjSettings?: { hjid: number; hjsv: number }
  }
}
