import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import tz from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(tz)

export default dayjs

export { dayjs }
