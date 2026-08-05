import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-4">
      Execute esta instrucao no projeto: altere a cor dos titulos dos menus para azul escuro
    </div>
  ),
});
