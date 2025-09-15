import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compileRecipe } from "../lib/recipes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { opportunity_id, package_code } = await req.json();

    if (!opportunity_id || !package_code) {
      return new Response(JSON.stringify({ error: "opportunity_id and package_code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: opp, error: oppErr } = await supabase
      .from("opportunity_views")
      .select("*")
      .eq("id", opportunity_id)
      .single();
    if (oppErr || !opp) throw oppErr ?? new Error("Opportunity not found");

    const recipe = compileRecipe(package_code as "P1" | "P2" | "P3", opp);

    const { data: run, error: runErr } = await supabase
      .from("automation_runs")
      .insert({
        opportunity_id,
        package_code,
        status: "in_progress",
        recipe,
      })
      .select("*")
      .single();

    if (runErr) throw runErr;

    return new Response(JSON.stringify({ run }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("automations-run error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


