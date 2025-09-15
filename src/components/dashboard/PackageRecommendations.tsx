import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PackageSuggestion = { code: "P1" | "P2" | "P3"; reasonCodes?: string[]; confidence?: number; status?: string };
type Opportunity = { id: string; packages?: PackageSuggestion[] };

async function runAutomation(opportunityId: string, packageCode: "P1" | "P2" | "P3") {
  const url = `${import.meta.env.VITE_SUPABASE_EDGE_URL}/automations-run`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opportunity_id: opportunityId, package_code: packageCode }),
  });
  if (!res.ok) throw new Error("Failed to start automation");
  return res.json();
}

export function PackageRecommendations({ opportunity }: { opportunity: Opportunity }) {
  const pkgs = opportunity.packages ?? [];
  const mutation = useMutation({
    mutationFn: ({ id, code }: { id: string; code: "P1" | "P2" | "P3" }) => runAutomation(id, code),
  });

  if (!pkgs.length) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Recommended Packages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pkgs.map((p) => (
          <div key={p.code} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{label(p.code)}</div>
              <div className="text-sm text-muted-foreground">
                Reasons: {p.reasonCodes?.join(", ") || "—"}
                {typeof p.confidence === "number" ? ` • Confidence: ${(p.confidence * 100).toFixed(0)}%` : ""}
              </div>
            </div>
            <Button onClick={() => mutation.mutate({ id: opportunity.id, code: p.code })} disabled={mutation.isPending}>
              {mutation.isPending ? "Starting…" : "Run"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function label(code: "P1" | "P2" | "P3") {
  switch (code) {
    case "P1":
      return "P1 — Always-On AI Receptionist";
    case "P2":
      return "P2 — AI Sales Follow-Up (Virtual SDR)";
    case "P3":
      return "P3 — Web Presence Turbo (Site + Chat + Calculator)";
  }
}


