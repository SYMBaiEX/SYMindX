export type ToolEffect = 'read' | 'write';

export interface ToolPermissionRequest {
  readonly name: string;
  readonly effect: ToolEffect;
  readonly allow: readonly string[];
  readonly approved: boolean;
  readonly mood?: 'positive' | 'negative' | 'calm' | 'activated';
}

export type ToolDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string };

export function decideTool(request: ToolPermissionRequest): ToolDecision {
  if (!request.allow.includes(request.name)) {
    return { allowed: false, reason: 'tool is not on the allow list' };
  }
  if (request.effect === 'write' && request.approved === false) {
    if (request.mood === 'activated') {
      return { allowed: false, reason: 'activated appraisal holds the write until approval' };
    }
    if (request.mood === 'negative') {
      return { allowed: false, reason: 'negative appraisal holds the write until approval' };
    }
    return { allowed: false, reason: 'write requires approval' };
  }
  return { allowed: true };
}
