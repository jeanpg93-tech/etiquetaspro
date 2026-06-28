import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DEFAULT_SETTINGS,
  PRESETS,
  loadSettings,
  saveSettings,
  type LabelPresetId,
  type LabelSettings,
} from "@/lib/labels/settings";
import { generateLabelsPdf, type LabelOrder } from "@/lib/labels/pdf";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Etiquetas Pro" }] }),
  component: SettingsPage,
});

const SAMPLE: LabelOrder[] = [
  {
    order_number: "PED-1042",
    recipient_name: "Maria da Silva Souza",
    recipient_address: "Rua das Acácias, 123, Apto 402 — Jardim das Flores",
    recipient_city: "São Paulo",
    recipient_state: "SP",
    recipient_zip: "01310-100",
  },
];

function SettingsPage() {
  const [settings, setSettings] = useState<LabelSettings>(DEFAULT_SETTINGS);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const previewBlob = useMemo(() => generateLabelsPdf(SAMPLE, settings), [settings]);

  useEffect(() => {
    const url = URL.createObjectURL(previewBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewBlob]);

  function patch<K extends keyof LabelSettings>(k: K, v: LabelSettings[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  function handleSave() {
    saveSettings(settings);
    toast.success("Configurações salvas");
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    toast.success("Restaurado para o padrão");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Configurações de Etiqueta</h1>
          <p className="text-sm text-muted-foreground">Escolha um preset e ajuste os campos exibidos. As mudanças se aplicam a todas as impressões.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />Padrão
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />Salvar
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Preset</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.preset}
                onValueChange={(v) => patch("preset", v as LabelPresetId)}
                className="space-y-3"
              >
                {Object.values(PRESETS).map((p) => (
                  <label
                    key={p.id}
                    htmlFor={`preset-${p.id}`}
                    className="flex items-start gap-3 border rounded-md p-3 cursor-pointer hover:border-primary/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem id={`preset-${p.id}`} value={p.id} className="mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Campos exibidos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                ["showOrderNumber", "Número do pedido"],
                ["showRecipientName", "Nome do destinatário"],
                ["showAddress", "Endereço"],
                ["showCityState", "Cidade / UF"],
                ["showZip", "CEP"],
                ["showBorder", "Borda da etiqueta (apoio visual)"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm font-normal">{label}</Label>
                  <Switch
                    id={key}
                    checked={settings[key as keyof LabelSettings] as boolean}
                    onCheckedChange={(c) => patch(key as keyof LabelSettings, c as never)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tamanho da fonte</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Escala</span>
                <span className="font-mono">{settings.fontScale.toFixed(2)}×</span>
              </div>
              <Slider
                value={[settings.fontScale]}
                min={0.8}
                max={1.4}
                step={0.05}
                onValueChange={([v]) => patch("fontScale", v)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            Pré-visualização (dados de exemplo)
          </div>
          <div className="border rounded-md bg-muted/30 overflow-hidden">
            {previewUrl && (
              <iframe
                key={previewUrl}
                src={previewUrl}
                title="Pré-visualização"
                className="w-full"
                style={{ height: "70vh", border: 0, background: "white" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
