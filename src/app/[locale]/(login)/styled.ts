"use client"

import { COLORS } from "@/theme/colors"
import { Box, styled, Typography } from "@mui/material"
import Image from "next/image"

export const ContentContainer = styled(Box)({
  display: "flex",
  height: "100%",
  width: "100%",
  padding: "10px",
  position: "relative",
})

export const Header = styled(Box)({
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "25px 20px",

  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 2,
})

export const Illustration = styled(Image)({
  width: "min-content",
  height: "100%",
  objectFit: "contain",
})

export const ConnectContainer = styled(Box)({
  height: "100%",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
})

export const Title = styled(Typography)({
  marginBottom: "12px",
})

export const Description = styled(Typography)({
  color: COLORS.santasGrey,
  textAlign: "center",

  width: "223px",
  marginBottom: "36px",
})

export const Footer = styled(Box)({
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 20px 15px 25px",

  position: "absolute",
  bottom: 0,
  right: 0,
  zIndex: 2,
})

export const Copyright = styled(Typography)({
  color: "#FFFFFF",
})

export const DownloadIcon = styled(Box)({
  rotate: "270deg",
  marginLeft: "2px",
})
