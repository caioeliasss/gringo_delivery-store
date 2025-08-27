import React from "react";
import { GlobalNotificationsProvider } from "../../../contexts/GlobalNotificationsContext";
import StoreNotificationsComponent from "../../../components/StoreNotifications/StoreNotifications";

const StoreNotificationsPage = () => {
  return (
    <GlobalNotificationsProvider userType="store">
      <StoreNotificationsComponent />
    </GlobalNotificationsProvider>
  );
};

export default StoreNotificationsPage;
