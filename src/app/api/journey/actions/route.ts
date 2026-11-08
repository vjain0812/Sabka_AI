import { journeyActionSchema } from '@/lib/domain/journey';
import { journeyStore } from '@/lib/server/journey-store';
import {
  assertCatalogTool,
  journeyOwner,
  journeyView,
  validationError,
} from '@/lib/server/journey-api';
import { clientKey, limit } from '@/lib/server/rate-limit';
import { AppError, errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

const forbidden = () =>
  new AppError(403, 'NOT_ALLOWED', 'That journey can’t be changed from this device.');

/** One endpoint for every change; responds with the updated journey (and a new goal id). */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { id, who } = await journeyOwner(request);
    limit(`journey-act:${clientKey(request)}`, 120, 60_000);
    let action;
    try {
      action = journeyActionSchema.parse(await readJson(request, 8192));
    } catch (error) {
      validationError(error);
    }
    const store = await journeyStore();
    let goalId: string | null = null;
    switch (action.type) {
      case 'add_goal':
        goalId = await store.addGoal(id, who, action.goal);
        if (!goalId) throw forbidden();
        break;
      case 'save': {
        await assertCatalogTool(action.slug);
        const r = await store.saveTool(id, who, action.slug, action.goalId);
        if (r === 'forbidden') throw forbidden();
        if (r === 'bad_goal') throw new AppError(400, 'INVALID_INPUT', 'That goal wasn’t found.');
        if (r === 'limit')
          throw new AppError(400, 'TOOL_LIMIT', 'You can save up to 30 tools. Remove one first.');
        break;
      }
      case 'remove':
        if (!(await store.removeTool(id, who, action.slug)))
          throw new AppError(404, 'NOT_FOUND', 'That tool isn’t in your journey.');
        break;
      case 'status': {
        const r = await store.setStatus(id, who, action.slug, action.status);
        if (r === 'forbidden') throw forbidden();
        if (r === 'not_saved') throw new AppError(404, 'NOT_FOUND', 'Save this tool first.');
        break;
      }
      case 'feedback': {
        const r = await store.addFeedback(id, who, action.slug, action.feedback);
        if (r === 'forbidden') throw forbidden();
        if (r === 'not_adopted')
          throw new AppError(400, 'INVALID_INPUT', 'Tell us whether you’re trying it first.');
        if (r === 'rate_limited')
          throw new AppError(429, 'RATE_LIMITED', 'That’s a lot of feedback for one tool.');
        break;
      }
    }
    return json({ ...(await journeyView(store, id, who)), goalId });
  } catch (error) {
    return errorResponse(error);
  }
}
