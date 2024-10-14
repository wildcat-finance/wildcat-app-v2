import { Chip, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { Box } from "@mui/system"
import { useTranslation } from "react-i18next"

import Clock from "@/assets/icons/clock_icon.svg"
import { Base } from "@/components/Notification/Base"
import { TNotification } from "@/store/slices/notificationsSlice/interface"
import { COLORS } from "@/theme/colors"

export const Notification = ({
  type,
  description,
  date,
  unread = false,
  error = false,
  data,
  action,
}: TNotification) => {
  const { t } = useTranslation()

  switch (type) {
    case "borrowerRegistrationChange": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
        />
      )
    }
    case "aprDecreaseEnded": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
        >
          <Box sx={{ display: "flex", gap: "4px" }}>
            <Typography variant="text3" color={COLORS.greySuit}>
              <s>{data.apr}</s>
              &nbsp;
              <Typography variant="text3">{`→ ${data.newApr}`}</Typography>
            </Typography>
            <Chip
              sx={{
                backgroundColor: COLORS.cherub,
                color: COLORS.dullRed,
                marginTop: "2px",
              }}
              label={
                data.percentageIncrease > 0
                  ? `+${Math.round(data.percentageIncrease * 100) / 100}% ↑`
                  : `${Math.round(data.percentageIncrease * 100) / 100}% ↓`
              }
            />
          </Box>
        </Base>
      )
    }
    case "lenderAdded":
    case "lenderRemoved": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
          action={action}
        />
      )
    }
    case "withdrawalStarted": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
        >
          <Chip
            sx={{
              backgroundColor: COLORS.oasis,
              color: COLORS.galliano,
              marginTop: "2px",
            }}
            label="2:10:05"
            icon={
              <SvgIcon
                fontSize="tiny"
                sx={{ "& path": { fill: `${COLORS.galliano}` } }}
                component={Clock}
              />
            }
          />
        </Base>
      )
    }
    case "lenderClaimed": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
        >
          <Chip
            sx={{
              backgroundColor: COLORS.whiteSmoke,
              color: COLORS.santasGrey,
              marginTop: "2px",
            }}
            label={`- ${data.amount} ${data.token}`}
          />
        </Base>
      )
    }
    case "withdrawalSuccess": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
        />
      )
    }
    case "withdrawalFailed": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
        >
          <Chip
            sx={{
              backgroundColor: COLORS.cherub,
              color: COLORS.dullRed,
              marginTop: "2px",
            }}
            label={`${t("notifications.missing")} ${data.amount} ${data.token}`}
          />
        </Base>
      )
    }
    case "loanTaken": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
        />
      )
    }
    case "loanRepaid": {
      return (
        <Base
          unread={unread}
          error={error}
          description={description}
          date={date}
        />
      )
    }
    default: {
      return null
    }
  }
}
