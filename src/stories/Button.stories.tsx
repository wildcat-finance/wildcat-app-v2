import { Button, Box } from "@mui/material"
import type { Meta } from "@storybook/react"

export default {
  title: "Components/Button",
  component: Button,
} as Meta<typeof Button>

export const Text = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Button variant="text" size="large">
        Label
      </Button>
      <Button variant="text" size="medium">
        Label
      </Button>
      <Button variant="text" size="small">
        Label
      </Button>
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Button variant="text" size="large" disabled>
        Label
      </Button>
      <Button variant="text" size="medium" disabled>
        Label
      </Button>
      <Button variant="text" size="small" disabled>
        Label
      </Button>
    </Box>
  </Box>
)

export const Contained = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Button variant="contained" size="large">
        Label
      </Button>
      <Button variant="contained" size="medium">
        Label
      </Button>
      <Button variant="contained" size="small">
        Label
      </Button>
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Button variant="contained" size="large" disabled>
        Label
      </Button>
      <Button variant="contained" size="medium" disabled>
        Label
      </Button>
      <Button variant="contained" size="small" disabled>
        Label
      </Button>
    </Box>
  </Box>
)

export const Outlined = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Button variant="outlined" size="large">
        Label
      </Button>
      <Button variant="outlined" size="medium">
        Label
      </Button>
      <Button variant="outlined" size="small">
        Label
      </Button>
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Button variant="outlined" size="large" disabled>
        Label
      </Button>
      <Button variant="outlined" size="medium" disabled>
        Label
      </Button>
      <Button variant="outlined" size="small" disabled>
        Label
      </Button>
    </Box>
  </Box>
)

export const Secondary = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Button variant="outlined" color="secondary" size="large">
        Label
      </Button>
      <Button variant="outlined" color="secondary" size="medium">
        Label
      </Button>
      <Button variant="outlined" color="secondary" size="small">
        Label
      </Button>
    </Box>
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Button variant="outlined" color="secondary" size="large" disabled>
        Label
      </Button>
      <Button variant="outlined" color="secondary" size="medium" disabled>
        Label
      </Button>
      <Button variant="outlined" color="secondary" size="small" disabled>
        Label
      </Button>
    </Box>
  </Box>
)
