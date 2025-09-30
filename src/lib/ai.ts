// src/lib/ai.ts
type Tool = { type: "web_search"; };

export async function runAgent({
  model = "gpt-5",                 // your default reasoning model
  systemPrompt,                    // contents of prompts/*.md
  schema,                          // JSON.parse(fs.readFileSync(schema))
  extraHints = ""                  // optional user hints (league focus, etc.)
}: {
  model?: string;
  systemPrompt: string;
  schema: any;
  extraHints?: string;
}) {
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      // Tools: enable **Web Search** so the agent can browse & cite
      tools: [{ type: "web_search" } as Tool],                    // :contentReference[oaicite:1]{index=1}
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: extraHints || "Generate now." }
      ],
      // Enforce JSON Schema using **Structured Outputs**
      response_format: {
        type: "json_schema",
        json_schema: { name: "AgentOutput", schema, strict: true } // strict=true is important
      }
    })
  });

  if (!resp.ok) throw new Error(`OpenAI error: ${await resp.text()}`);

  const json = await resp.json();

  // The Responses API returns a unified envelope; extract the text JSON
  const content = json.output_text ??      // some SDKs provide this helper
                  json.output?.[0]?.content?.[0]?.text ?? null;

  if (!content) throw new Error("No content from model");
  let data: any;
  try { data = JSON.parse(content); }
  catch { throw new Error("Model did not return valid JSON"); }

  return data;
}
