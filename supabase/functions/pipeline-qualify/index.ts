import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recommendPackages } from "../lib/recommender.ts";

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
    const { lead_id, owner_user_id } = await req.json();

    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadErr } = await supabase
      .from("businesses")
      .select("id, business_name, city, state, website_url, detected_features, review_count, user_rating_count, rating")
      .eq("id", lead_id)
      .single();

    if (leadErr || !lead) throw leadErr ?? new Error("Lead not found");

    let { data: opp } = await supabase
      .from("opportunities")
      .select("*")
      .eq("lead_id", lead_id)
      .single();

    if (!opp) {
      const suggestions = recommendPackages(lead);
      const { data: created, error: insErr } = await supabase
        .from("opportunities")
        .insert({
          lead_id,
          stage: "Qualified",
          packages: suggestions,
          owner_user_id: owner_user_id ?? null,
        })
        .select("*")
        .single();
      if (insErr) throw insErr;
      opp = created!;
    }

    return new Response(JSON.stringify({ opportunity: opp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pipeline-qualify error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


