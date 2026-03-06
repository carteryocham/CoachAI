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
        model: 'gpt-4o',
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

    // Multi-meal extraction
    let meals = null;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
    const looksLikeFood = /ate|had|eat|eating|breakfast|lunch|dinner|snack|meal|protein|calories|tuna|egg|beef|rice|chicken|shake|burger|pizza|salad|sandwich|coffee|drink|food|macros/i.test(lastUserMsg);

    if (looksLikeFood) {
      const extractPrompt = `You are a macro extraction engine. From the coach response below, extract EVERY distinct meal or food item mentioned as a separate entry.

If the user logged multiple meals (breakfast + lunch + dinner + snacks), return each as a SEPARATE object in the array.
If only one meal is mentioned, return an array with one object.
Always estimate ALL four macros using standard nutritional values even if not explicitly stated.
Assign a meal_type to each: "Breakfast", "Lunch", "Dinner", or "Snack".

Return ONLY a raw JSON array, no markdown, no extra text:
[
  {"meal_type":"Breakfast","calories":450,"protein":35,"carbs":40,"fats":12,"description":"3 eggs with toast and orange juice"},
  {"meal_type":"Lunch","calories":650,"protein":45,"carbs":60,"fats":18,"description":"Chicken rice bowl with vegetables"}
]

NEVER return null. NEVER return a single object — always an array.
If no food is mentioned at all, return [].

Coach response to parse:
${content}`;

      const extractResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: extractPrompt }],
          max_tokens: 400,
          temperature: 0,
        }),
      });

      if (extractResp.ok) {
        const extractData = await extractResp.json();
        const raw = extractData.choices?.[0]?.message?.content?.trim();
        if (raw && raw !== '[]') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              meals = parsed;
            }
          } catch (_) {}
        }
      }
    }

    return new Response(JSON.stringify({ content, meals }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});