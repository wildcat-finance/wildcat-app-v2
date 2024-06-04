import React from "react"

import { Box, Tab, Tabs } from "@mui/material"
import type { Meta } from "@storybook/react"

export default {
  title: "Components/Tabs",
  component: Tabs,
} as Meta<typeof Tabs>

export const LinedTabs = () => {
  const [value, setValue] = React.useState("one")

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }
  return (
    <Box sx={{ width: "100%" }}>
      <Tabs value={value} onChange={handleChange} aria-label="tabs example">
        <Tab value="one" label="Item One" />
        <Tab value="two" label="Item Two" />
        <Tab value="three" label="Item Three" />
      </Tabs>
    </Box>
  )
}
