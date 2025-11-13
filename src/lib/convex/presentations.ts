import { v } from "convex/values";
import { noAuthMsg, notMentorMsg } from "../constants/errorMessages";
import { defaultDurationMinutes } from "../constants/presentations";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./user";

export const beginPresentation = mutation({
  args: {
    projectDevpostId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);

      if (!user) return { success: false, message: noAuthMsg };

      if (user.role !== "mentor") {
        return { success: false, message: notMentorMsg };
      }

      if (!user.groupId) {
        return { success: false, message: "You are not assigned any judges." };
      }

      const group = await ctx.db.get(user.groupId);
      const judgingStatus = await ctx.db.query("judgingStatus").first();

      if (judgingStatus?.active === false) {
        return { success: false, message: "Please wait until judging begins." };
      }

      if (!group) {
        return {
          success: false,
          message: "Your group could not be found in the system.",
        };
      }

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

      if (group.currentProjectPresenting) {
        const projectPresenting = await ctx.db
          .query("projects")
          .withIndex("by_devpostId", (q) =>
            q.eq("devpostId", group.currentProjectPresenting!)
          )
          .first();

        if (!projectPresenting)
          return {
            success: false,
            message: "The project presenting could not be found in the system.",
          };

        return {
          success: false,
          message: `Cannot start presentation for ${project.name}. ${projectPresenting.name} is currently presenting.`,
        };
      }

      const presentedProjects = await ctx.db
        .query("projects")
        .withIndex("by_groupId_hasPresented", (q) =>
          q.eq("groupId", group._id).eq("hasPresented", true)
        )
        .collect();

      for (const project of presentedProjects) {
        const scores = await ctx.db
          .query("scores")
          .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
          .collect();

        const judgesWhoScored = scores.map((s) => s.judgeId);
        const judgesWhoHaventScored = group.judgeIds.filter(
          (judgeId) => !judgesWhoScored.includes(judgeId)
        );

        if (judgesWhoHaventScored.length > 0) {
          const judgeDocsDirty = await Promise.all(
            judgesWhoHaventScored.map((judgeId) => ctx.db.get(judgeId))
          );
          const judgeDocs = judgeDocsDirty.filter((judge) => judge !== null);

          const judgeNames = judgeDocs
            .map((judge) => judge.name ?? "Unknown Judge")
            .join(", ");

          return {
            success: false,
            message: `Cannot start presentation. The following judges have not scored "${project.name}": ${judgeNames}`,
          };
        }
      }

      const now = Date.now();
      const updatedPresentations = group.presentations.map((slot) =>
        slot.projectDevpostId === args.projectDevpostId
          ? {
              ...slot,
              status: "presenting" as const,
              timerState: {
                remainingSeconds: slot.duration * 60,
                isPaused: false,
                startedAt: now,
              },
            }
          : slot
      );

      await ctx.db.patch(group._id, {
        ...group,
        currentProjectPresenting: args.projectDevpostId,
        presentations: updatedPresentations,
      });

      const durationMs = defaultDurationMinutes * 60 * 1000;
      const delayMs = Math.max(0, now + durationMs - Date.now() + 500);

      await ctx.scheduler.runAfter(
        delayMs,
        internal.presentations.autoCompletePresentation,
        {
          groupId: group._id,
          projectDevpostId: args.projectDevpostId,
          projectId: project._id,
        }
      );

      return {
        success: true,
        message: `Presentation for ${project.name} started.`,
      };
    } catch (err: unknown) {
      console.error(`error presentation for ${args.projectDevpostId}`, err);

      return {
        success: false,
        message: "Unknown error starting presentation. Please try again.",
      };
    }
  },
});

export const getServerTime = query({
  handler: async () => {
    return Date.now();
  },
});

export const autoCompletePresentation = internalMutation({
  args: {
    groupId: v.id("groups"),
    projectDevpostId: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);

    if (!group) {
      console.error(`group ${args.groupId} not found`);

      return;
    }

    const currentPresentation = group.presentations.find(
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

    if (remaining > 1) {
      return;
    }

    if (group.judgeIds.length === 0) {
      console.error(`no judges found in group ${args.groupId}`);

      return;
    }

    const updatedPresentations = group.presentations.map((slot) =>
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

    await ctx.db.patch(args.groupId, {
      ...group,
      currentProjectPresenting: undefined,
      presentations: updatedPresentations,
    });

    await ctx.db.patch(args.projectId, { hasPresented: true });
  },
});

export const endPresentation = mutation({
  args: {
    projectDevpostId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);

      if (!user) return { success: false, message: noAuthMsg };

      if (user.role !== "mentor") {
        return { success: false, message: notMentorMsg };
      }

      if (!user.groupId) {
        return { success: false, message: "You are not assigned any judges." };
      }

      const group = await ctx.db.get(user.groupId);
      const judgingStatus = await ctx.db.query("judgingStatus").first();

      if (judgingStatus?.active === false) {
        return { success: false, message: "Please wait until judging begins." };
      }

      if (!group) {
        return {
          success: false,
          message: "Your group could not be found in the system.",
        };
      }

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

      const newPresentations = group.presentations.map((slot) =>
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

      await ctx.db.patch(group._id, {
        ...group,
        currentProjectPresenting: undefined,
        presentations: newPresentations,
      });

      await ctx.db.patch(project._id, { hasPresented: true });

      return {
        success: true,
        message: `Presentation ended. Please tell your judges to submit scores for ${project.name}.`,
      };
    } catch (err: unknown) {
      console.error(
        `error ending presentation for ${args.projectDevpostId}`,
        err
      );

      return {
        success: false,
        message: "Unknown error ending presentation. Please try again.",
      };
    }
  },
});

export const pausePresentation = mutation({
  args: {
    projectDevpostId: v.string(),
    projectName: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);

      if (!user) return { success: false, message: noAuthMsg };

      if (user.role !== "mentor") {
        return { success: false, message: notMentorMsg };
      }

      if (!user.groupId) {
        return { success: false, message: "You are not assigned any judges." };
      }

      const group = await ctx.db.get(user.groupId);
      const judgingStatus = await ctx.db.query("judgingStatus").first();

      if (judgingStatus?.active === false) {
        return { success: false, message: "Please wait until judging begins." };
      }

      if (!group) {
        return {
          success: false,
          message: "Your group could not be found in the system.",
        };
      }

      const newPresentations = group.presentations.map((slot) =>
        slot.projectDevpostId === args.projectDevpostId
          ? {
              ...slot,
              timerState: {
                ...slot.timerState,
                isPaused: true,
                remainingSeconds: slot.timerState.startedAt
                  ? Math.max(
                      0,
                      slot.duration * 60 -
                        Math.floor(
                          (Date.now() - slot.timerState.startedAt) / 1000
                        )
                    )
                  : slot.timerState.remainingSeconds,
              },
            }
          : slot
      );

      await ctx.db.patch(group._id, {
        ...group,
        currentProjectPresenting: undefined,
        presentations: newPresentations,
      });

      return {
        success: true,
        message: `Presentation for ${args.projectName} paused.`,
      };
    } catch (err: unknown) {
      console.error(
        `error pausing presentation for ${args.projectDevpostId}`,
        err
      );

      return {
        success: false,
        message: "Unknown error pausing presentation. Please try again.",
      };
    }
  },
});

export const resumePresentation = mutation({
  args: {
    projectDevpostId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);

      if (!user) return { success: false, message: noAuthMsg };

      if (user.role !== "mentor") {
        return { success: false, message: notMentorMsg };
      }

      if (!user.groupId) {
        return { success: false, message: "You are not assigned any judges." };
      }

      const group = await ctx.db.get(user.groupId);
      const judgingStatus = await ctx.db.query("judgingStatus").first();

      if (judgingStatus?.active === false) {
        return { success: false, message: "Please wait until judging begins." };
      }

      if (!group) {
        return {
          success: false,
          message: "Your group could not be found in the system.",
        };
      }

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

      if (group.currentProjectPresenting) {
        const projectPresenting = await ctx.db
          .query("projects")
          .withIndex("by_devpostId", (q) =>
            q.eq("devpostId", group.currentProjectPresenting!)
          )
          .first();

        if (!projectPresenting)
          return {
            success: false,
            message: "The project presenting could not be found in the system.",
          };

        return {
          success: false,
          message: `Cannot start presentation for ${project.name}. ${projectPresenting.name} is currently presenting.`,
        };
      }

      const newPresentations = group.presentations.map((slot) =>
        slot.projectDevpostId === args.projectDevpostId
          ? {
              ...slot,
              timerState: {
                ...slot.timerState,
                isPaused: false,
                startedAt: new Date(
                  Date.now() -
                    (slot.duration * 60 - slot.timerState.remainingSeconds) *
                      1000
                ).getTime(),
              },
            }
          : slot
      );

      await ctx.db.patch(group._id, {
        ...group,
        currentProjectPresenting: args.projectDevpostId,
        presentations: newPresentations,
      });

      const resumedPresentation = group.presentations.find(
        (p) =>
          p.projectDevpostId === args.projectDevpostId &&
          p.status === "presenting"
      );

      if (resumedPresentation && resumedPresentation.timerState.startedAt) {
        const durationMs = defaultDurationMinutes * 60 * 1000;
        const scheduledTime =
          resumedPresentation.timerState.startedAt + durationMs;

        const delayMs = Math.max(0, scheduledTime - Date.now() + 500);

        await ctx.scheduler.runAfter(
          delayMs,
          internal.presentations.autoCompletePresentation,
          {
            groupId: group._id,
            projectDevpostId: args.projectDevpostId,
            projectId: project._id,
          }
        );
      }

      return {
        success: true,
        message: `Presentation for ${project.name} resumed.`,
      };
    } catch (err: unknown) {
      console.error(
        `error resuming presentation for ${args.projectDevpostId}`,
        err
      );

      return {
        success: false,
        message: "Unknown error resuming presentation. Please try again.",
      };
    }
  },
});

export const checkIncompleteScores = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user || !user.groupId) {
      return null;
    }

    if (user.role !== "mentor") {
      return null;
    }

    const group = await ctx.db.get(user.groupId);

    if (!group) {
      return null;
    }

    const presentedProjects = await ctx.db
      .query("projects")
      .withIndex("by_groupId_hasPresented", (q) =>
        q.eq("groupId", group._id).eq("hasPresented", true)
      )
      .collect();

    const incompleteProjects: {
      projectName: string;
      missingJudges: string[];
    }[] = [];

    for (const project of presentedProjects) {
      const scores = await ctx.db
        .query("scores")
        .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
        .collect();

      const judgesWhoScored = scores.map((s) => s.judgeId);
      const judgesWhoHaventScored = group.judgeIds.filter(
        (judgeId) => !judgesWhoScored.includes(judgeId)
      );

      if (judgesWhoHaventScored.length > 0) {
        const judgeDocsDirty = await Promise.all(
          judgesWhoHaventScored.map((judgeId) => ctx.db.get(judgeId))
        );
        const judgeDocs = judgeDocsDirty.filter((judge) => judge !== null);

        const judgeNames = judgeDocs.map(
          (judge) => judge.name ?? "Unknown Judge"
        );

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
        if (!mentor.groupId) {
          return {
            mentorName: mentor.name || "Unknown Mentor",
            totalProjects: 0,
            presentedProjects: 0,
            currentlyPresenting: null as string | null,
            allComplete: false,
          };
        }

        const group = await ctx.db.get(mentor.groupId);

        if (!group) {
          return {
            mentorName: mentor.name || "Unknown Mentor",
            totalProjects: 0,
            presentedProjects: 0,
            currentlyPresenting: null as string | null,
            allComplete: false,
          };
        }

        const totalProjects = group.projectDevpostIds.length;

        const presentedCount = group.presentations.filter(
          (p) => p.status === "completed"
        ).length;

        const currentPresentation = group.presentations.find(
          (p) => p.status === "presenting"
        );

        return {
          mentorName: mentor.name || "Unknown Mentor",
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

export const getGroupPresentations = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user || user.role !== "mentor") {
      return null;
    }

    if (!user.groupId) {
      return null;
    }

    const group = await ctx.db.get(user.groupId);

    if (!group) {
      return null;
    }

    return group.presentations;
  },
});
