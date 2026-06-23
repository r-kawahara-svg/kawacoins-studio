/**
 * Gate logic — determines whether an article's judgment is complete
 * and whether the body contains all required placeholders.
 */

export interface JudgmentRecord {
  tradeView: string | null;
  position: string | null;
  uniqueTake: string | null;
  completed: boolean | null;
}

/**
 * Returns true when all three judgment fields are filled in.
 */
export function isJudgmentComplete(judgment: JudgmentRecord): boolean {
  return !!(
    judgment.tradeView?.trim() &&
    judgment.position?.trim() &&
    judgment.uniqueTake?.trim()
  );
}

/**
 * Checks whether the article body contains all required JUDGMENT placeholders.
 */
export function hasRequiredPlaceholders(bodyMd: string): boolean {
  return (
    bodyMd.includes("[JUDGMENT:trade]") &&
    bodyMd.includes("[JUDGMENT:position]") &&
    bodyMd.includes("[JUDGMENT:take]")
  );
}

/**
 * Returns the gate status: 'open' means not yet complete, 'closed' means ready to publish.
 */
export function gateStatus(
  judgment: JudgmentRecord,
  bodyMd: string
): "open" | "closed" {
  return isJudgmentComplete(judgment) && hasRequiredPlaceholders(bodyMd)
    ? "closed"
    : "open";
}
