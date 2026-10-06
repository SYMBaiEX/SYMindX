import { createMind, labelAppraisal, type Mind } from '../../../../packages/agent/src/index.js';
import {
  codingPolicy,
  planPolicy,
  type MindState,
  type SpeakRequest,
  type Speaker,
  type TeamIO,
} from '../../../../packages/orchestration/src/index.js';
import { runChatTurn } from './chat-turn.js';
import { runCodingTurn } from './coding.js';
import { createWorkspaceIO } from './files.js';
import { terminalColor } from './term.js';
import { renderTool } from './ui/index.js';
import { createWebResearch } from './web.js';

const SENDER = /^[A-Za-z0-9_.:-]{1,64}$/;

export interface PlanGate {
  plan: boolean;
}

export function createOllamaSpeaker(
  base: string,
  workspaceRoot: string,
  gate: PlanGate = { plan: false },
  team: TeamIO,
): Speaker {
  const io = createWorkspaceIO(workspaceRoot);
  const research = createWebResearch();
  const onTool = (name: string, detail: string): void => {
    process.stderr.write(renderTool(terminalColor(process.stderr), name, detail));
  };
  return {
    async speak(request, signal) {
      const history = request.history.slice(-16);
      let now = Date.now() - history.length * 2;
      const mind = createMind(request.character, now);
      for (const turn of history) {
        const ownLine = turn.role === 'agent' && turn.speakerId === request.character.id;
        if (!ownLine) {
          const sender = SENDER.test(turn.speakerId) ? turn.speakerId : 'user';
          now += 1;
          mind.hear({ channel: 'local', sender, text: turn.text }, now);
          now += 1;
          mind.step(now);
          continue;
        }
        now += 2;
        if (turn.text.trim().length > 0) {
          mind.say(turn.text, now);
        }
      }
      const saved = request.mind;
      if (saved !== undefined) {
        mind.restore({
          appraisal: {
            valence: saved.valence,
            arousal: saved.arousal,
            dominance: saved.dominance,
            updatedAt: saved.updatedAt,
          },
          intention:
            saved.goal.length === 0 && saved.steps.length === 0
              ? undefined
              : { goal: saved.goal, steps: saved.steps.slice(), createdAt: saved.updatedAt },
          lastAt: saved.lastAt,
        });
      }
      if (request.mode === 'chat') {
        const answer = await runChatTurn(
          mind,
          base,
          signal,
          request.message.text,
          request.message.sender,
          research,
          onTool,
          team,
          request.character.id,
          workBrief(request.work),
        );
        return { text: answer.text, tools: answer.tools, changed: [], mind: captureMind(mind) };
      }
      const policy = gate.plan ? planPolicy() : codingPolicy();
      const coded = await runCodingTurn(
        mind,
        base,
        signal,
        request.message.text,
        request.message.sender,
        io,
        onTool,
        policy,
        team,
        request.character.id,
        workBrief(request.work),
      );
      return { text: coded.text, tools: coded.tools, changed: coded.changed, mind: captureMind(mind) };
    },
  };
}

function workBrief(work: SpeakRequest['work']): string {
  return work.map((item) => `${item.id} (${item.status}) ${item.title}`).join('\n');
}

function captureMind(mind: Mind): MindState {
  const snap = mind.snapshot();
  const intention = snap.intention;
  return {
    valence: snap.appraisal.valence,
    arousal: snap.appraisal.arousal,
    dominance: snap.appraisal.dominance,
    updatedAt: snap.appraisal.updatedAt,
    label: labelAppraisal(snap.appraisal),
    goal: intention === undefined ? '' : intention.goal,
    steps: intention === undefined ? [] : intention.steps.map((step) => ({ id: step.id, text: step.text, status: step.status })),
    lastAt: snap.lastAt,
  };
}
