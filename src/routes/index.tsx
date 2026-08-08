import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-4">
      analise a imagem
    </div>
  ),
});
