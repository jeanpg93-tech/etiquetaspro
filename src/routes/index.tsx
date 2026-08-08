import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-4">
      descreva a imagem em anexo!
    </div>
  ),
});
