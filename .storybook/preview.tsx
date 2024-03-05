import { ThemeProvider } from "@mui/material";
import React from "react";
import { theme } from "../src/theme/theme"

export const withMuiTheme = (Story) => (
  <ThemeProvider theme={theme}>
    <Story />
  </ThemeProvider>
);

export const decorators = [withMuiTheme];