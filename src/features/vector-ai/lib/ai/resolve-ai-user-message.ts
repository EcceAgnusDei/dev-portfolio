const FALLBACK_UNCHANGED =
  "L'IA n'a pas pu traiter cette demande. Reformulez et réessayez.";
const FALLBACK_CHANGED = "Dessin modifié par l'IA.";
const FALLBACK_NO_CHANGE = "L'IA n'a pas modifié le dessin.";

export type ResolveAiUserMessageInput = {
  message?: string;
  docChanged: boolean;
};

export type ResolveAiUserMessageResult = {
  text: string;
  variant: "info";
};

export function resolveAiUserMessage(
  input: ResolveAiUserMessageInput,
): ResolveAiUserMessageResult {
  const trimmed = input.message?.trim();
  if (trimmed) {
    return { text: trimmed, variant: "info" };
  }

  if (input.docChanged) {
    return { text: FALLBACK_CHANGED, variant: "info" };
  }

  return { text: FALLBACK_NO_CHANGE, variant: "info" };
}

export function resolveAiServerMessage(
  ops: readonly unknown[],
  message?: string,
): string | undefined {
  const trimmed = message?.trim();
  if (trimmed) return trimmed;
  if (ops.length === 0) return FALLBACK_UNCHANGED;
  return undefined;
}
