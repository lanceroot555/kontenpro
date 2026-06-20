import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/components/account-settings";

export const Route = createFileRoute("/admin/settings")({
  component: AccountSettings,
});
