import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symptoms, vitalsContext, duration, severity } = await req.json();
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error("Cloudflare configuration is missing (ACCOUNT_ID or API_TOKEN)");
    }

    const systemPrompt = `You are VitalSync Symptom Analyzer. Analyze reported symptoms in context of the user's vitals data.

IMPORTANT RULES:
- NEVER diagnose. Only provide general health education.
- Always recommend seeing a healthcare professional.
- Correlate symptoms with vitals data when possible.
- Flag urgent symptoms that need immediate medical attention.

Structure your response as:

## Symptom Assessment

### Reported Symptoms
List the symptoms reported.

### Vitals Correlation
How the current vitals data relates to the symptoms.

### Possible Considerations
General health information (NOT diagnoses) that may be relevant.

### Recommended Actions
- Immediate steps the user can take
- When to see a doctor
- What to monitor

### ⚠️ Important Notice
"This is not a medical diagnosis. Please consult a healthcare professional for proper evaluation."

Use clear markdown formatting and be empathetic.`;

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
            content: `Analyze these symptoms:\n\nSymptoms: ${symptoms}\nDuration: ${duration || "Not specified"}\nSeverity: ${severity || "Not specified"}\n\nCurrent vitals context:\n${vitalsContext || "No vitals data available."}`,
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
    console.error("symptom-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
