import * as React from "react"

import { Checkbox as MUICheckbox } from "@mui/material"
import { CheckboxProps } from "@mui/material/Checkbox"
import { styled } from "@mui/material/styles"

import { COLORS } from "@/theme/colors"

const Icon = styled("span")({
  border: `1px solid ${COLORS.iron}`,
  borderRadius: "4px",
  width: 16,
  height: 16,
  padding: "2px",
  transition: "border 0.2s",
  "input:hover ~ &": { borderColor: COLORS.santasGrey },
})

const IconSmall = styled("span")({
  border: `1px solid ${COLORS.iron}`,
  borderRadius: "4px",
  width: 12,
  height: 12,
  padding: "1px",
  transition: "border 0.2s",
  "input:hover ~ &": { borderColor: COLORS.santasGrey },
})

const CheckedIcon = styled(Icon)({
  borderColor: COLORS.blueRibbon,
  backgroundColor: COLORS.blueRibbon,
  "&::before": {
    content: '""',
    display: "block",
    width: 16,
    height: 16,
    background: `center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 10.5' fill='none'%3E%3Cpath d='M0.349609 5.43697L1.42915 4.32901L5.17916 8.02219L12.9348 0.294922L14.0428 1.40288L5.17916 10.2381L0.349609 5.43697Z' fill='white'/%3E%3C/svg%3E")`,
  },
  "input:hover ~ &": { borderColor: COLORS.blueRibbon },
})

const CheckedIconSmall = styled(IconSmall)({
  borderColor: COLORS.blueRibbon,
  backgroundColor: COLORS.blueRibbon,
  "&::before": {
    content: '""',
    display: "block",
    width: 12,
    height: 12,
    background: `center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 10.5' fill='none'%3E%3Cpath d='M0.349609 5.43697L1.42915 4.32901L5.17916 8.02219L12.9348 0.294922L14.0428 1.40288L5.17916 10.2381L0.349609 5.43697Z' fill='white'/%3E%3C/svg%3E")`,
  },
  "input:hover ~ &": { borderColor: COLORS.blueRibbon },
})

const indeterminateStyles = {
  borderColor: COLORS.blueRibbon,
  backgroundColor: COLORS.blueRibbon,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "&::before": {
    content: '""',
    display: "block",
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: "white",
    transform: "translate(0.1px, 0.3px)",
  },
  "input:hover ~ &": { borderColor: COLORS.blueRibbon },
} as const

const IndeterminateIcon = styled(Icon)(indeterminateStyles)
const IndeterminateIconSmall = styled(IconSmall)({
  ...indeterminateStyles,
  "&::before": {
    content: '""',
    display: "block",
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: "white",
  },
})

export default function ExtendedCheckbox(props: CheckboxProps) {
  return props.size === "small" ? (
    <MUICheckbox
      icon={<IconSmall />}
      checkedIcon={<CheckedIconSmall />}
      indeterminateIcon={<IndeterminateIconSmall />}
      {...props}
    />
  ) : (
    <MUICheckbox
      icon={<Icon />}
      checkedIcon={<CheckedIcon />}
      indeterminateIcon={<IndeterminateIcon />}
      {...props}
    />
  )
}
