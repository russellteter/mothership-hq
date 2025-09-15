// supabase/functions/lib/recommender.ts
// Deterministic mapping from lead evidence → suggested packages.

export type LeadRecord = {
  website_url?: string | null;
  detected_features?: any;
  review_count?: number | null;
  user_rating_count?: number | null;
};

export type PackageSuggestion = {
  code: "P1" | "P2" | "P3";
  reasonCodes: string[];
  confidence: number;
  status: "draft" | "active";
};

export function recommendPackages(lead: LeadRecord): PackageSuggestion[] {
  const out: PackageSuggestion[] = [];
  const df = lead.detected_features ?? {};
  const hasWebsite = !!lead.website_url;
  const reviews =
    (typeof lead.review_count === "number" ? lead.review_count : null) ??
    (typeof lead.user_rating_count === "number" ? lead.user_rating_count : 0);

  const noBooking = !(df?.online_booking?.found);

  if (!hasWebsite) {
    out.push({
      code: "P3",
      reasonCodes: ["no_website"],
      confidence: 0.9,
      status: "draft",
    });
  }

  if (noBooking && reviews > 50) {
    out.push({
      code: "P1",
      reasonCodes: ["no_booking", "high_reviews"],
      confidence: 0.8,
      status: "draft",
    });
  }

  if (hasWebsite && noBooking) {
    out.push({
      code: "P3",
      reasonCodes: ["has_website_no_booking"],
      confidence: 0.6,
      status: "draft",
    });
  }

  if (reviews > 80) {
    out.push({
      code: "P2",
      reasonCodes: ["inbound_volume_likely"],
      confidence: 0.6,
      status: "draft",
    });
  }

  return out.filter((p) => p.confidence >= 0.55);
}


