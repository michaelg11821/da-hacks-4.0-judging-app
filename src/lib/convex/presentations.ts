import { v } from "convex/values";
import { noAuthMsg, notMentorMsg } from "../constants/errorMessages";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
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

    const activePresentation = args.newPresentations.find(
      (p) => p.status === "presenting" && p.projectName !== args.projectName
    );

    if (activePresentation) {
      return {
        success: false,
        message: `Cannot start ${args.projectName}. ${activePresentation.projectName} is currently presenting.`,
      };
    }

    const presentedProjects = await ctx.db
      .query("projects")
      .collect()
      .then((projects) =>
        projects.filter((p) => {
          const isInGroup = user.judgingSession!.projects.some(
            (gp) => gp.devpostId === p.devpostId
          );
          return isInGroup && p.hasPresented;
        })
      );

    const judgeIds = group.judges.map((j) => j._id);

    for (const project of presentedProjects) {
      const judgesWhoScored = project.scores.map((s) => s.judgeId);
      const judgesWhoHaventScored = judgeIds.filter(
        (judgeId) => !judgesWhoScored.includes(judgeId)
      );

      if (judgesWhoHaventScored.length > 0) {
        const judgeNames = group.judges
          .filter((j) => judgesWhoHaventScored.includes(j._id))
          .map((j) => j.name || "Unknown")
          .join(", ");

        return {
          success: false,
          message: `Cannot start new presentation. The following judges have not scored "${project.name}": ${judgeNames}`,
        };
      }
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

    const startedPresentation = args.newPresentations.find(
      (p) => p.projectName === args.projectName && p.status === "presenting"
    );

    if (startedPresentation && startedPresentation.timerState.startedAt) {
      const durationMs = startedPresentation.duration * 60 * 1000;
      const scheduledTime =
        startedPresentation.timerState.startedAt + durationMs;

      const delayMs = Math.max(0, scheduledTime - Date.now() + 2000);

      await ctx.scheduler.runAfter(
        delayMs,
        internal.presentations.autoCompletePresentation,
        {
          mentorName: user.name ?? "Unknown Mentor",
          projectDevpostId: startedPresentation.projectDevpostId,
          projectName: args.projectName,
        }
      );
    }

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

    const activePresentation = args.newPresentations.find(
      (p) => p.status === "presenting" && p.projectName !== args.projectName
    );

    if (activePresentation) {
      return {
        success: false,
        message: `Cannot resume ${args.projectName}. ${activePresentation.projectName} is currently presenting.`,
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

    const resumedPresentation = args.newPresentations.find(
      (p) => p.projectName === args.projectName && p.status === "presenting"
    );

    if (resumedPresentation && resumedPresentation.timerState.startedAt) {
      const durationMs = resumedPresentation.duration * 60 * 1000;
      const scheduledTime =
        resumedPresentation.timerState.startedAt + durationMs;

      const delayMs = Math.max(0, scheduledTime - Date.now() + 2000);

      console.log(
        `[resumePresentation] Scheduling auto-complete for ${args.projectName} in ${delayMs}ms (${Math.floor(delayMs / 1000)}s)`
      );

      await ctx.scheduler.runAfter(
        delayMs,
        internal.presentations.autoCompletePresentation,
        {
          mentorName: user.name ?? "Unknown Mentor",
          projectDevpostId: resumedPresentation.projectDevpostId,
          projectName: args.projectName,
        }
      );
    }

    return {
      success: true,
      message: `Presentation for ${args.projectName} resumed.`,
    };
  },
});

export const checkIncompleteScores = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.judgingSession) {
      return null;
    }

    if (user.role !== "mentor") {
      return null;
    }

    const group = await getGroupByMentorName(
      ctx,
      user.name ?? "Unknown Mentor"
    );

    if (!group) {
      return null;
    }

    const presentedProjects = await ctx.db
      .query("projects")
      .collect()
      .then((projects) =>
        projects.filter((p) => {
          const isInGroup = user.judgingSession!.projects.some(
            (gp) => gp.devpostId === p.devpostId
          );
          return isInGroup && p.hasPresented;
        })
      );

    const judgeIds = group.judges.map((j) => j._id);
    const incompleteProjects: Array<{
      projectName: string;
      missingJudges: string[];
    }> = [];

    for (const project of presentedProjects) {
      const judgesWhoScored = project.scores.map((s) => s.judgeId);
      const judgesWhoHaventScored = judgeIds.filter(
        (judgeId) => !judgesWhoScored.includes(judgeId)
      );

      if (judgesWhoHaventScored.length > 0) {
        const judgeNames = group.judges
          .filter((j) => judgesWhoHaventScored.includes(j._id))
          .map((j) => j.name || "Unknown");

        incompleteProjects.push({
          projectName: project.name,
          missingJudges: judgeNames,
        });
      }
    }

    return {
      hasIncompleteScores: incompleteProjects.length > 0,
      incompleteProjects,
    };
  },
});

export const getAllGroupsPresentationStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user || user.role !== "director") {
      return null;
    }

    const mentors = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "mentor"))
      .collect();

    const groupStatuses = await Promise.all(
      mentors.map(async (mentor) => {
        if (!mentor.judgingSession) {
          return {
            mentorName: mentor.name || "Unknown",
            totalProjects: 0,
            presentedProjects: 0,
            currentlyPresenting: null as string | null,
            allComplete: false,
          };
        }

        const totalProjects = mentor.judgingSession.projects.length;
        const presentations = mentor.judgingSession.presentations;

        const presentedCount = presentations.filter(
          (p) => p.status === "completed"
        ).length;

        const currentPresentation = presentations.find(
          (p) => p.status === "presenting"
        );

        return {
          mentorName: mentor.name || "Unknown",
          totalProjects,
          presentedProjects: presentedCount,
          currentlyPresenting: currentPresentation?.projectName || null,
          allComplete: presentedCount === totalProjects && totalProjects > 0,
        };
      })
    );

    const allGroupsComplete = groupStatuses.every((g) => g.allComplete);

    return {
      groups: groupStatuses,
      allGroupsComplete,
    };
  },
});

export const autoCompletePresentation = internalMutation({
  args: {
    mentorName: v.string(),
    projectDevpostId: v.string(),
    projectName: v.string(),
  },
  handler: async (ctx, args) => {
    const mentor = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "mentor"))
      .filter((q) => q.eq(q.field("name"), args.mentorName))
      .first();

    if (!mentor || !mentor.judgingSession) {
      console.error(
        `[autoCompletePresentation] mentor ${args.mentorName} not found or has no judging session`
      );
      return;
    }

    const currentPresentation = mentor.judgingSession.presentations.find(
      (p) => p.projectDevpostId === args.projectDevpostId
    );

    if (!currentPresentation) {
      return;
    }

    if (currentPresentation.status !== "presenting") {
      return;
    }

    if (currentPresentation.timerState.isPaused) {
      return;
    }

    const elapsed = currentPresentation.timerState.startedAt
      ? Math.floor(
          (Date.now() - currentPresentation.timerState.startedAt) / 1000
        )
      : 0;
    const remaining = Math.max(0, currentPresentation.duration * 60 - elapsed);

    if (remaining > 3) {
      return;
    }

    const judges = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "judge"))
      .collect();

    const judgesInGroup = judges.filter(
      (judge) => judge.judgingSession?.mentorName === args.mentorName
    );

    if (judgesInGroup.length === 0) {
      console.error(
        `[autoCompletePresentation] No judges found for mentor ${args.mentorName}`
      );
      return;
    }

    const newPresentations = mentor.judgingSession.presentations.map((slot) =>
      slot.projectDevpostId === args.projectDevpostId
        ? {
            ...slot,
            status: "completed" as const,
            timerState: {
              remainingSeconds: 0,
              isPaused: true,
            },
          }
        : slot
    );

    await ctx.db.patch(mentor._id, {
      judgingSession: {
        ...mentor.judgingSession,
        presentations: newPresentations,
        currentProjectPresenting: undefined,
      },
    });

    const project = await ctx.db
      .query("projects")
      .withIndex("by_devpostId", (q) =>
        q.eq("devpostId", args.projectDevpostId)
      )
      .first();

    if (project) {
      await ctx.db.patch(project._id, { hasPresented: true });
    }

    await Promise.all(
      judgesInGroup.map((judge) => {
        if (!judge.judgingSession) {
          return;
        }

        return ctx.db.patch(judge._id, {
          judgingSession: {
            ...judge.judgingSession,
            presentations: newPresentations,
            currentProjectPresenting: undefined,
          },
        });
      })
    );
  },
});
