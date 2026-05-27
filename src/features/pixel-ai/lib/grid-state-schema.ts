import { z } from "zod";

const gridAiAsciiSchema = z.object({
  rows: z.array(z.string()),
});

type ParseGridAiAsciiRowsResult =
  | { ok: true; rows: string[] }
  | { ok: false; error: string };

export function parseAndValidateGridAiAsciiRowsJson(
  raw: string,
): ParseGridAiAsciiRowsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: "JSON invalide." };
  }

  const result = gridAiAsciiSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: "Réponse IA invalide." };
  }

  const rows = result.data.rows;
  if (rows.length === 0) return { ok: true, rows: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (typeof row !== "string" || row.length === 0) {
      return {
        ok: false,
        error: "Réponse IA invalide.",
      };
    }
  }

  return { ok: true, rows };
}
