import * as React from "react"
import { styled } from "@mui/material/styles"
import { CheckboxProps } from "@mui/material/Checkbox"
import { Checkbox as MUICheckbox } from "@mui/material"
import { COLORS } from "../../../theme/colors"

const Icon = styled("span")({
  border: `1px solid ${COLORS.iron}`,
  borderRadius: "4px",
  width: 14,
  height: 14,
  padding: "2px",
  transition: "border 0.2s",
  "input:hover ~ &": {
    borderColor: COLORS.santasGrey,
  },
})

const CheckedIcon = styled(Icon)({
  border: `1px solid ${COLORS.blueRibbon}`,
  backgroundColor: COLORS.blueRibbon,
  "&::before": {
    display: "block",
    width: 14,
    height: 14,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundImage:
      "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 10.5' fill='none'%3E%3Cpath d='M0.349609 5.43697L1.42915 4.32901L5.17916 8.02219L12.9348 0.294922L14.0428 1.40288L5.17916 10.2381L0.349609 5.43697Z' fill='white'/%3E%3C/svg%3E\")",
    content: '""',
  },
  "input:hover ~ &": {
    borderColor: COLORS.blueRibbon,
  },
})

const IconSmall = styled("span")({
  border: `1px solid ${COLORS.iron}`,
  borderRadius: "4px",
  width: 12,
  height: 12,
  padding: "1px",
  transition: "border 0.2s",
  "input:hover ~ &": {
    borderColor: COLORS.santasGrey,
  },
})

const CheckedIconSmall = styled(Icon)({
  border: `1px solid ${COLORS.blueRibbon}`,
  backgroundColor: COLORS.blueRibbon,
  width: 10,
  height: 10,
  "&::before": {
    display: "block",
    width: 10,
    height: 10,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundImage:
      "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 10.5' fill='none'%3E%3Cpath d='M0.349609 5.43697L1.42915 4.32901L5.17916 8.02219L12.9348 0.294922L14.0428 1.40288L5.17916 10.2381L0.349609 5.43697Z' fill='white'/%3E%3C/svg%3E\")",
    content: '""',
  },
  "input:hover ~ &": {
    borderColor: COLORS.blueRibbon,
  },
})

export default function Checkbox(props: CheckboxProps) {
  return props.size === "small" ? (
    <MUICheckbox
      checkedIcon={<CheckedIconSmall />}
      icon={<IconSmall />}
      {...props}
    />
  ) : (
    <MUICheckbox checkedIcon={<CheckedIcon />} icon={<Icon />} {...props} />
  )
}
