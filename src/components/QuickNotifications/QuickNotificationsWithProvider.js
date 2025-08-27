import React from "react";
import { GlobalNotificationsProvider } from "../../contexts/GlobalNotificationsContext";
import QuickNotifications from "../QuickNotifications/QuickNotifications";

const QuickNotificationsWithProvider = () => {
  return (
    <GlobalNotificationsProvider userType="store">
      <QuickNotifications />
    </GlobalNotificationsProvider>
  );
};

export default QuickNotificationsWithProvider;
