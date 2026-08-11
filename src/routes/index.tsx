import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Atenção: Banco de Dados Indisponível</h1>
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-red-800 space-y-4">
        <p className="font-semibold">O backend do Supabase para este projeto foi removido ou desativado.</p>
        <p>O erro <code className="bg-red-100 px-1 rounded">TypeError: fetch failed</code> ocorre porque o host <code className="bg-red-100 px-1 rounded">gncfempcicxrujbfbkcf.supabase.co</code> não existe mais.</p>
        <div className="bg-white p-4 rounded border border-red-200 text-sm font-mono overflow-auto">
          {"$ curl -I https://gncfempcicxrujbfbkcf.supabase.co"}<br/>
          {"curl: (6) Could not resolve host: gncfempcicxrujbfbkcf.supabase.co"}
        </div>
        <p className="pt-4 border-t border-red-200">
          Para corrigir isso, você precisa clicar em <strong>"Lovable Cloud"</strong> no menu lateral e reativar a conexão com o banco de dados. 
          Isso gerará novas credenciais e eu poderei reaplicar as tabelas.
        </p>
      </div>
    </div>
  ),
});
