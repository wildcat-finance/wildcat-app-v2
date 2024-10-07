import { Base } from "@/components/Notification/Base"
import { NotificationProps } from "@/components/Notification/type"

export const Notification = ({ type, description, date, unread = false, error = false, data, action }: NotificationProps) => {
  switch (type) {
    case "borrowerRegistrationChange": {
      return <Base unread={unread} error={error} description={description} date={date} />;
    }
    default: {
      return null;
    }
  }
}