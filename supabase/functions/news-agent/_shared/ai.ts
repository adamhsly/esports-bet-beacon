// supabase/functions/_shared/ai.ts
type Tool = { type: "web_search" };

export async function runAgent({
  model = "gpt-5",
  systemPrompt,
  schema,
  extraHints = ""
}: {
  model?: string;
  systemPrompt: string;
  schema: any;
  extraHints?: string;
}) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      tools: [{ type: "web_search" } as Tool],
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: extraHints || "Generate now." }
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "AgentOutput", schema, strict: true }
      }
    })
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI error: ${t}`);
  }

  const json = await resp.json();
  const content =
    json.output_text ??
    json.output?.[0]?.content?.[0]?.text ??
    null;

  if (!content) throw new Error("No content from model");
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Model did not return valid JSON");
  }
}
