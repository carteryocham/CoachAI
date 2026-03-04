import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, maxTokens = 700, temperature = 0.8 } = await req.json();

    // Main coach response
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!openaiResp.ok) {
      const err = await openaiResp.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await openaiResp.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    // Silent macro extraction — only if message looks like a food log
    let macros = null;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const looksLikeFood = /ate|had|eat|breakfast|lunch|dinner|snack|meal|protein|calories|calories|tuna|egg|beef|rice|chicken|shake/i.test(lastUserMsg);

    if (looksLikeFood) {
      const extractPrompt = `From this coach response, extract the macros for ONLY the most recently described food or meal (not a running daily total). Always estimate carbs and fats using standard nutritional values even if not explicitly listed. Return ONLY a raw JSON object: {"calories":600,"protein":45,"carbs":55,"fats":18,"description":"[short 1 sentence description of this specific meal]"}. ALWAYS include all four numbers. Never return null if any food was mentioned. No markdown, no extra text. Response to parse:\n\n${content}`;

      const extractResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: extractPrompt }],
          max_tokens: 150,
          temperature: 0,
        }),
      });

      if (extractResp.ok) {
        const extractData = await extractResp.json();
        const raw = extractData.choices?.[0]?.message?.content?.trim();
        if (raw && raw !== 'null') {
          try { macros = JSON.parse(raw); } catch (_) {}
        }
      }
    }

    return new Response(JSON.stringify({ content, macros }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});