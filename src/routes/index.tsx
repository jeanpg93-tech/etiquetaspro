import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-4">
      altere os textos em azul para vermelho
    </div>
  ),
});
