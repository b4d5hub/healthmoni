import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { vitalsData, period, userName } = await req.json();
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error("Cloudflare configuration is missing (ACCOUNT_ID or API_TOKEN)");
    }

    const systemPrompt = `You are VitalSync AI Report Generator. Generate a comprehensive health report in markdown format.

Structure the report as follows:
# Health Report — ${period || "Weekly"} Summary

## Overview
Brief summary of overall health status.

## Heart Rate Analysis
- Average, min, max heart rate
- Resting heart rate assessment
- Trends and patterns

## Temperature Analysis  
- Average temperature
- Any fever episodes detected
- Patterns

## HRV (Heart Rate Variability)
- Average HRV
- Stress/recovery assessment
- Trends

## Key Findings
Numbered list of important observations.

## Recommendations
Actionable health recommendations based on data.

## Disclaimer
Always include: "This report is for informational purposes only and does not constitute medical advice."

Be specific with the numbers provided. Use emoji sparingly for visual clarity (✅ ⚠️ 📊).`;

    const model = "@cf/meta/llama-3.1-8b-instruct";
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a ${period || "weekly"} health report for ${userName || "the user"} based on this vitals data:\n\n${JSON.stringify(vitalsData, null, 2)}`,
          },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Cloudflare AI error:", response.status, err);
      return new Response(JSON.stringify({ error: "Cloudflare AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
