import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/creator/")({
  component: () => <Navigate to="/creator/new" replace />,
});
