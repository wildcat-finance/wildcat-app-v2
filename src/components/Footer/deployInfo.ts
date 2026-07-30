import { dayjs } from "@/utils/dayjs"

const DEPLOY_DATE_FORMAT = "DD.MM.YYYY HH:mm"

export const formatDeployDate = (buildTime: string | undefined) =>
  buildTime ? dayjs(buildTime).utc().format(DEPLOY_DATE_FORMAT) : null
