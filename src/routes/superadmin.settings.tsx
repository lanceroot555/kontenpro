import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/components/account-settings";

export const Route = createFileRoute("/superadmin/settings")({
  component: AccountSettings,
});
