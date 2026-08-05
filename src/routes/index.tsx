import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-4">
      Execute esta instrucao no projeto: oi
    </div>
  ),
});
