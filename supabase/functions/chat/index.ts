import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, vitalsContext } = await req.json();
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
    
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error("Cloudflare configuration is missing (ACCOUNT_ID or API_TOKEN)");
    }

    const systemPrompt = `You are VitalSync AI, a friendly and knowledgeable health assistant.
    
Current vitals context:
${vitalsContext || "No vitals data available yet."}

Guidelines:
- Provide helpful, evidence-based health information
- Always recommend consulting a healthcare professional for medical decisions
- Be empathetic and supportive
- Reference the user's actual vitals data when relevant
- Keep responses concise but informative
- Use markdown formatting for clarity
- Never diagnose conditions — only provide general health education`;

    // Cloudflare Workers AI Endpoint
    // Model recommendation: @cf/meta/llama-3.1-8b-instruct
    const model = "@cf/meta/llama-3.1-8b-instruct";
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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

    // Proxy the stream
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
