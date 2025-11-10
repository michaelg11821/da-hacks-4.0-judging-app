import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type QueryCtx } from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);

  if (userId === null) {
    return null;
  }

  return await ctx.db.get(userId);
}

export const currentUser = query({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
