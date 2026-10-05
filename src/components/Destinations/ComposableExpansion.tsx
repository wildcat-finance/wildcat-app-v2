import * as React from "react"

import { Box, Collapse, Fade, FormControlLabel, Switch } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useMarketDestinations } from "@/hooks/destinations/useDestinations"
import { COLORS } from "@/theme/colors"

import { ComposableChip } from "./ComposableToggles"
import { DestinationsPanel } from "./DestinationsPanel"

type ComposableExpansionValue = {
  expandedId: string | null
  toggle: (id: string) => void
  close: () => void
}

const ComposableExpansionContext =
  React.createContext<ComposableExpansionValue>({
    expandedId: null,
    toggle: () => {},
    close: () => {},
  })

export const useComposableExpansion = () =>
  React.useContext(ComposableExpansionContext)

export const ComposableExpansionProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const value = React.useMemo<ComposableExpansionValue>(
    () => ({
      expandedId,
      toggle: (id) => {
        const key = id.toLowerCase()
        setExpandedId((current) => (current === key ? null : key))
      },
      close: () => setExpandedId(null),
    }),
    [expandedId],
  )

  return (
    <ComposableExpansionContext.Provider value={value}>
      {children}
    </ComposableExpansionContext.Provider>
  )
}

const panelId = (rowId: string) => `composable-panel-${rowId.toLowerCase()}`

export const ComposableChipCell = ({
  rowId,
  count,
}: {
  rowId: string
  count: number
}) => {
  const { expandedId, toggle } = useComposableExpansion()
  if (!count) return null

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      <ComposableChip
        count={count}
        expanded={expandedId === rowId.toLowerCase()}
        onToggle={() => toggle(rowId)}
        controls={panelId(rowId)}
      />
    </Box>
  )
}

export const ComposableRowPanel = ({
  rowId,
  chainId,
  marketSymbol,
  aprBips,
  withdrawalBatchDuration,
  dividerBelow = false,
}: {
  rowId: string
  chainId: number
  marketSymbol: string
  aprBips: number
  withdrawalBatchDuration: number
  dividerBelow?: boolean
}) => {
  const { t } = useTranslation()
  const { expandedId, close } = useComposableExpansion()
  const expanded = expandedId === rowId.toLowerCase()
  const { destinations, stale } = useMarketDestinations(chainId, rowId)
  const ref = React.useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = React.useState(expanded)
  if (expanded && !mounted) setMounted(true)

  React.useEffect(() => {
    if (expanded && destinations.length === 0) close()
  }, [expanded, destinations.length, close])

  if (!mounted || destinations.length === 0) return null

  const closeAndRefocus = () => {
    const trigger = document.querySelector<HTMLElement>(
      `[aria-controls="${panelId(rowId)}"]`,
    )
    close()
    trigger?.focus()
  }

  return (
    <Box
      ref={ref}
      role="row"
      sx={{
        width: "var(--DataGrid-rowWidth)",
        maxWidth: "100%",
        cursor: "default",
      }}
    >
      <Collapse
        appear
        in={expanded}
        timeout={250}
        onEntered={() =>
          ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
        }
        onExited={() => setMounted(false)}
      >
        <Fade in={expanded} timeout={250}>
          <Box
            sx={{
              boxSizing: "border-box",
              padding: "4px 0 16px",
              ...(dividerBelow && {
                borderBottom: `1px solid ${COLORS.athensGrey}`,
              }),
            }}
          >
            <Box
              role="gridcell"
              id={panelId(rowId)}
              aria-label={`${t(
                "destinations.panel.whatYouCanDo",
              )} ${marketSymbol}`}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeAndRefocus()
              }}
            >
              <DestinationsPanel
                destinations={destinations}
                stale={stale}
                marketSymbol={marketSymbol}
                aprBips={aprBips}
                withdrawalBatchDuration={withdrawalBatchDuration}
                closeVariant="collapse"
                onClose={closeAndRefocus}
              />
            </Box>
          </Box>
        </Fade>
      </Collapse>
    </Box>
  )
}

export const ComposableOnlySwitch = ({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) => {
  const { t } = useTranslation()

  return (
    <FormControlLabel
      label={t("destinations.composableOnly")}
      control={
        <Switch
          disableRipple
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          sx={{
            width: 27,
            height: 15,
            borderRadius: "7.5px",
            "&:active .MuiSwitch-thumb": { width: 14 },
            "& .MuiSwitch-switchBase": {
              padding: "1.5px",
              "&.Mui-checked": { transform: "translateX(12px)" },
            },
            "& .MuiSwitch-thumb": {
              width: 12,
              height: 12,
              borderRadius: "6px",
              boxShadow: "none",
            },
            "& .MuiSwitch-track": {
              borderRadius: "7.5px",
              backgroundColor: COLORS.iron,
            },
            "& .MuiSwitch-switchBase.Mui-focusVisible + .MuiSwitch-track": {
              outline: `2px solid ${COLORS.ultramarineBlue}`,
              outlineOffset: "1px",
            },
          }}
        />
      }
      sx={{
        margin: 0,
        gap: "8px",
        padding: "2px 12px",
        borderRadius: "20px",
        "& .MuiFormControlLabel-label": {
          fontSize: "13px",
          lineHeight: "20px",
          fontWeight: 500,
          color: COLORS.blackRock,
          whiteSpace: "nowrap",
        },
      }}
    />
  )
}
