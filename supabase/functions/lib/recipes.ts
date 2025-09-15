// supabase/functions/lib/recipes.ts
// Compiles a provider-agnostic "recipe" for a selected package.

export type RecipeStep = {
  type: "generate" | "provision" | "configure" | "testcall" | "schedule" | "notify";
  provider: "openai.responses" | "telephony" | "messaging" | "crm" | "web" | "email";
  name: string;
  params?: Record<string, unknown>;
};

export type Recipe = {
  version: "1.0";
  package: "P1" | "P2" | "P3";
  guards: string[];
  steps: RecipeStep[];
  human_approvals: string[];
  context?: Record<string, unknown>;
};

export function compileRecipe(code: "P1" | "P2" | "P3", opp: any): Recipe {
  const lead = {
    businessName: opp.business_name,
    city: opp.city,
    state: opp.state,
    website: opp.website_url,
    features: opp.detected_features ?? {},
  };

  if (code === "P1") {
    return {
      version: "1.0",
      package: "P1",
      guards: ["consent.voice == true"],
      human_approvals: ["offer_one_pager", "voice_agent"],
      context: { lead },
      steps: [
        { type: "generate", provider: "openai.responses", name: "offer_one_pager", params: { package: "P1" } },
        { type: "provision", provider: "telephony", name: "buy_number", params: { area: opp.state ?? "SC" } },
        { type: "configure", provider: "telephony", name: "voice_agent", params: { calendar: "google" } },
        { type: "testcall", provider: "telephony", name: "smoke_test" },
        { type: "notify", provider: "email", name: "client_summary" },
      ],
    };
  }
  if (code === "P2") {
    return {
      version: "1.0",
      package: "P2",
      guards: ["consent.sms == true || consent.email == true"],
      human_approvals: ["offer_one_pager", "sequence_copy"],
      context: { lead },
      steps: [
        { type: "generate", provider: "openai.responses", name: "offer_one_pager", params: { package: "P2" } },
        { type: "generate", provider: "openai.responses", name: "sequence_copy", params: { channels: ["email", "sms"] } },
        { type: "configure", provider: "crm", name: "webhook_ingest" },
        { type: "schedule", provider: "messaging", name: "sequence_activate", params: { cadence: ["D0", "D1", "D3"] } },
      ],
    };
  }
  return {
    version: "1.0",
    package: "P3",
    guards: [],
    human_approvals: ["offer_one_pager", "site_copy"],
    context: { lead },
    steps: [
      { type: "generate", provider: "openai.responses", name: "offer_one_pager", params: { package: "P3" } },
      { type: "generate", provider: "openai.responses", name: "site_copy" },
      { type: "provision", provider: "web", name: "scaffold_site" },
      { type: "configure", provider: "web", name: "embed_chat_and_quote" },
      { type: "notify", provider: "email", name: "go_live_summary" },
    ],
  };
}


