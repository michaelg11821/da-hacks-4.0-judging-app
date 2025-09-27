import { v } from "convex/values";
import { noAuthMsg, notMentorMsg } from "../constants/errorMessages";
import { mutation } from "./_generated/server";
import { getGroupByMentorName } from "./judging";
import { getCurrentUser } from "./user";
import { presentationSlotValidator } from "./validators";

export const beginPresentation = mutation({
  args: {
    newPresentations: v.array(presentationSlotValidator),
    projectName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) return { success: false, message: noAuthMsg };

    if (user.role !== "mentor") {
      return { success: false, message: notMentorMsg };
    }

    if (!user.judgingSession) {
      return { success: false, message: "You are not assigned any judges." };
    }

    if (!user.judgingSession.isActive) {
      return { success: false, message: "Please wait until judging begins." };
    }

    const group = await getGroupByMentorName(
      ctx,
      user.name ?? "Unknown Mentor"
    );

    if (!group) {
      return {
        success: false,
        message: "Your group could not be found in the system.",
      };
    }

    await ctx.db.patch(user._id, {
      judgingSession: {
        ...user.judgingSession,
        presentations: args.newPresentations,
        currentProjectPresenting: args.projectName,
      },
    });

    await Promise.all(
      group.judges.map((judge) => {
        if (!judge.judgingSession) {
          return;
        }

        return ctx.db.patch(judge._id, {
          judgingSession: {
            ...judge.judgingSession,
            presentations: args.newPresentations,
            currentProjectPresenting: args.projectName,
          },
        });
      })
    );

    return {
      success: true,
      message: `Presentation for ${args.projectName} has began.`,
    };
  },
});

export const endPresentation = mutation({
  args: {
    newPresentations: v.array(presentationSlotValidator),
    projectName: v.string(),
    projectDevpostId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) return { success: false, message: noAuthMsg };

    if (user.role !== "mentor") {
      return { success: false, message: notMentorMsg };
    }

    if (!user.judgingSession) {
      return { success: false, message: "You are not assigned any judges." };
    }

    if (!user.judgingSession.isActive) {
      return { success: false, message: "Please wait until judging begins." };
    }

    const group = await getGroupByMentorName(
      ctx,
      user.name ?? "Unknown Mentor"
    );

    if (!group) {
      return {
        success: false,
        message: "Your group could not be found in the system.",
      };
    }

    await ctx.db.patch(user._id, {
      judgingSession: {
        ...user.judgingSession,
        presentations: args.newPresentations,
        currentProjectPresenting: undefined,
      },
    });

    const project = await ctx.db
      .query("projects")
      .withIndex("by_devpostId", (q) =>
        q.eq("devpostId", args.projectDevpostId)
      )
      .first();

    if (!project) {
      return {
        success: false,
        message: "The project could not be found in the system.",
      };
    }

    await ctx.db.patch(project._id, { hasPresented: true });

    await Promise.all(
      group.judges.map((judge) => {
        if (!judge.judgingSession) {
          return;
        }

        return ctx.db.patch(judge._id, {
          judgingSession: {
            ...judge.judgingSession,
            presentations: args.newPresentations,
            currentProjectPresenting: undefined,
          },
        });
      })
    );

    return {
      success: true,
      message: `Presentation for ${args.projectName} ended.`,
    };
  },
});

export const pausePresentation = mutation({
  args: {
    newPresentations: v.array(presentationSlotValidator),
    projectName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) return { success: false, message: noAuthMsg };

    if (user.role !== "mentor") {
      return { success: false, message: notMentorMsg };
    }

    if (!user.judgingSession) {
      return { success: false, message: "You are not assigned any judges." };
    }

    if (!user.judgingSession.isActive) {
      return { success: false, message: "Please wait until judging begins." };
    }

    const group = await getGroupByMentorName(
      ctx,
      user.name ?? "Unknown Mentor"
    );

    if (!group) {
      return {
        success: false,
        message: "Your group could not be found in the system.",
      };
    }

    await ctx.db.patch(user._id, {
      judgingSession: {
        ...user.judgingSession,
        presentations: args.newPresentations,
        currentProjectPresenting: undefined,
      },
    });

    await Promise.all(
      group.judges.map((judge) => {
        if (!judge.judgingSession) {
          return;
        }

        return ctx.db.patch(judge._id, {
          judgingSession: {
            ...judge.judgingSession,
            presentations: args.newPresentations,
            currentProjectPresenting: undefined,
          },
        });
      })
    );

    return {
      success: true,
      message: `Presentation for ${args.projectName} paused.`,
    };
  },
});

export const resumePresentation = mutation({
  args: {
    newPresentations: v.array(presentationSlotValidator),
    projectName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) return { success: false, message: noAuthMsg };

    if (user.role !== "mentor") {
      return { success: false, message: notMentorMsg };
    }

    if (!user.judgingSession) {
      return { success: false, message: "You are not assigned any judges." };
    }

    if (!user.judgingSession.isActive) {
      return { success: false, message: "Please wait until judging begins." };
    }

    const group = await getGroupByMentorName(
      ctx,
      user.name ?? "Unknown Mentor"
    );

    if (!group) {
      return {
        success: false,
        message: "Your group could not be found in the system.",
      };
    }

    await ctx.db.patch(user._id, {
      judgingSession: {
        ...user.judgingSession,
        presentations: args.newPresentations,
        currentProjectPresenting: undefined,
      },
    });

    await Promise.all(
      group.judges.map((judge) => {
        if (!judge.judgingSession) {
          return;
        }

        return ctx.db.patch(judge._id, {
          judgingSession: {
            ...judge.judgingSession,
            presentations: args.newPresentations,
            currentProjectPresenting: undefined,
          },
        });
      })
    );

    return {
      success: true,
      message: `Presentation for ${args.projectName} resumed.`,
    };
  },
});
