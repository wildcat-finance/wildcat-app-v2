"use client"

import React from "react"
import { WagmiConfig } from "wagmi"

import { config } from "@/lib/config"
import { GenericProviderProps } from "./types"

export const WagmiProvider = ({
  children,
  initialState,
}: GenericProviderProps) => (
  <WagmiConfig reconnectOnMount config={config} initialState={initialState}>
    {children}
  </WagmiConfig>
)
