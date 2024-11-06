"use client"

import React from "react"

import { Box, TextField } from "@mui/material"

export const BorrowerContactInput = ({
  icon,
  text,
  name,
  onChange,
  error,
  placeholder,
}: {
  icon: JSX.Element
  text: string | undefined
  name: string
  onChange: (e: string) => void
  error?: boolean
  placeholder?: string
}) => (
  <Box
    display="flex"
    flexDirection="row"
    alignItems="center"
    gap={1}
    width="100%"
  >
    <Box
      display="flex"
      flexDirection="row"
      alignItems="center"
      gap={1}
      className="w-1/6"
    >
      {icon}
      {name}:
    </Box>
    <TextField
      error={error}
      className="text-sm h-8"
      placeholder={placeholder}
      size="small"
      value={text}
      onChange={(e) => onChange(e.target.value)}
    />
  </Box>
)
