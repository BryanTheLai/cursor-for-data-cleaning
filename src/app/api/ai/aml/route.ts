import { NextRequest, NextResponse } from "next/server";

const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

type AmlScanRow = { id: string; rowIndex: number; data: Record<string, string> };

type AmlFlag = { rowId: string; reason: string; riskLevel?: "info" | "watch" | "risk"; riskScore?: number };

const systemPrompt = `You are a Bank Compliance Officer. Analyze these transactions for Money Laundering (AML) risks or suspicious patterns.
Look for: Round number structuring, high velocity to new beneficiaries, or sanctioned entity names (e.g., "Evil Corp").
Return ONLY valid JSON with this shape:
{
  "flags": [
    { "rowId": "row-1", "reason": "Potential AML risk because ...", "riskLevel": "info" | "watch" | "risk" }
  ]
}
Include only rows that look suspicious. Use the provided rowId for mapping. Keep responses concise.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  let rows: AmlScanRow[] | undefined;
  try {
    const body = (await request.json()) as { rows?: AmlScanRow[] };
    rows = body.rows;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows is required and must not be empty" }, { status: 400 });
  }

  const userPrompt = `Analyze these transactions. Here is the clean_data JSON:\n${JSON.stringify(rows, null, 2)}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        { role: "user", content: [{ type: "text", text: userPrompt }] },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json(
      { error: `Claude request failed: ${response.status}`, details },
      { status: 500 }
    );
  }

  const completion = await response.json();
  const contentText: string | undefined =
    completion?.content?.[0]?.text ||
    (typeof completion?.content === "string" ? completion.content : undefined);

  if (!contentText) {
    return NextResponse.json({ error: "No content from Claude" }, { status: 500 });
  }

  let parsed: { flags?: AmlFlag[] };
  try {
    parsed = JSON.parse(contentText);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON from Claude", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }

  const flags = Array.isArray(parsed.flags)
    ? parsed.flags.filter((item) => item?.rowId && item?.reason)
    : [];

  return NextResponse.json({ flags });
}
