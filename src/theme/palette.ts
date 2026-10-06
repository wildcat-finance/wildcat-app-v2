import { PaletteOptions } from "@mui/material"

/* MUI's color helpers (darken/lighten/contrastText) can't parse CSS
 * variables, so palette values that go through those helpers must remain
 * hex. We drive the entire light/dark visual system through CSS variables
 * defined in globals.css and our own TOKENS layer; this palette just
 * keeps MUI's internal contrast math from blowing up. Mode stays "light"
 * so MUI doesn't auto-flip its computed variants — we handle the flip in
 * our tokens. */
export const PALETTE: PaletteOptions = {
  mode: "light",
  background: {
    default: "#FFFFFF",
    paper: "#FFFFFF",
  },
  text: {
    primary: "#141414",
    secondary: "#A0A0B0",
  },
  blueRibbon: {
    main: "#3E68FF",
  },
  dullRed: {
    main: "#C24647",
  },
  butteredRum: {
    main: "#9E7A11",
  },
  santasGrey: {
    main: "#A0A0B0",
  },
}
