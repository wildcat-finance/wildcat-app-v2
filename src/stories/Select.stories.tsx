import { Box } from "@mui/material"
import type { Meta } from "@storybook/react"

import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { mockedStories } from "@/mocks/mocks"

export default {
  title: "Components/Select",
  component: ExtendedSelect,
} as Meta<typeof ExtendedSelect>

export const ThemedSelect = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      rowGap: "30px",
    }}
  >
    <ExtendedSelect label="Please Select" options={mockedStories} />

    <ExtendedSelect small label="Please Select" options={mockedStories} />
  </Box>
)
