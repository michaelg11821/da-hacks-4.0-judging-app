import { v } from "convex/values";
import {
  noAuthMsg,
  notDirectorMsg,
  notJudgeMsg,
} from "../constants/errorMessages";
import { defaultDurationMinutes } from "../constants/presentations";
import type { Group, Score } from "../types/judging";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { getCurrentUser } from "./user";
import { groupValidator } from "./validators";

export const createGroups = action({
  handler: async (ctx) => {
    const currentUser = await ctx.runQuery(api.user.currentUser);

    if (!currentUser) return { success: false, message: noAuthMsg };

    if (currentUser.role !== "director")
      return { success: false, message: notDirectorMsg };

    const nonDirectors = await ctx.runQuery(internal.judging.listNonDirectors);

    if (!nonDirectors)
      return {
        success: false,
        message: "Failed to retrieve users who are not directors.",
      };

    if (nonDirectors.length === 0)
      return {
        success: false,
        message:
          "There are no judges or mentors in the system. Please have them log in to the app.",
      };

    const mentors = nonDirectors.filter((u) => u.role === "mentor");
    const judges = nonDirectors.filter((u) => u.role === "judge");

    if (mentors.length === 0) {
      return {
        success: false,
        message:
          "There are no mentors registered. Please have them log in to the app.",
      };
    }

    if (judges.length === 0) {
      return {
        success: false,
        message:
          "There are no judges registered. Please have them log in to the app.",
      };
    }

    const removalGroupsResult: { success: boolean; message: string } =
      await ctx.runMutation(internal.judging.removeAllGroups);

    if (!removalGroupsResult.success) {
      return { success: false, message: removalGroupsResult.message };
    }

    const groupsMembers = mentors.map((mentor, mentorIndex) => {
      const assignedJudgeIds: Id<"users">[] = [];
      const assignedJudgeNames: string[] = [];

      for (let i = 0; i < judges.length; i++) {
        if (i % mentors.length === mentorIndex) {
          assignedJudgeIds.push(judges[i]._id);
          assignedJudgeNames.push(judges[i].name ?? "Unknown Judge");
        }
      }

      return {
        mentorId: mentor._id,
        judgeIds: assignedJudgeIds,
        judgeNames: assignedJudgeNames,
      };
    });

    const groupIdMappings = new Map<Id<"users">, Id<"groups">>();

    for (let m = 0; m < mentors.length; m++) {
      const mentor = mentors[m];
      const assignedJudgeIds = groupsMembers[m]?.judgeIds ?? [];
      const assignedJudgeNames = groupsMembers[m]?.judgeNames ?? [];

      const groupBase: Group = {
        projectDevpostIds: [],
        judgeIds: assignedJudgeIds,
        judgeNames: assignedJudgeNames,
        presentations: [],
        mentorId: mentor._id,
        mentorName: mentor.name ?? "Unknown Mentor",
      };

      const groupId = await ctx.runMutation(internal.judging.createGroup, {
        group: groupBase,
      });

      groupIdMappings.set(mentor._id, groupId);

      await ctx.runMutation(internal.judging.setUserGroupId, {
        userId: mentor._id,
        groupId,
      });

      for (const judgeId of assignedJudgeIds) {
        await ctx.runMutation(internal.judging.setUserGroupId, {
          userId: judgeId,
          groupId,
        });
      }
    }

    const removalResult: { success: boolean; message: string } =
      await ctx.runMutation(internal.projectsConvex.removeAllProjects);

    if (!removalResult.success) {
      return { success: false, message: removalResult.message };
    }

    const scrapeResult: {
      success: boolean;
      message: string;
      projects: {
        devpostUrl: string;
        devpostId: string;
        name: string;
        hasPresented: boolean;
        teamMembers: string[];
      }[];
    } = await ctx.runAction(internal.projectsNode.importFromDevpost);

    if (!scrapeResult.success) {
      return { success: false, message: scrapeResult.message };
    }

    const scrapedProjects = scrapeResult.projects ?? [];

    if (scrapedProjects.length === 0) {
      return {
        success: false,
        message: "No projects available after scraping.",
      };
    }

    const projectDevpostIdsPerGroup: string[][] = mentors.map(
      () => [] as string[]
    );

    for (let i = 0; i < scrapedProjects.length; i++) {
      const g = i % mentors.length;
      const project = scrapedProjects[i];
      const groupId = groupIdMappings.get(mentors[g]._id);

      if (!groupId) {
        return {
          success: false,
          message: "Failed to find groupId for mentor.",
        };
      }

      await ctx.runMutation(internal.judging.insertProjectWithGroupId, {
        groupId,
        devpostId: project.devpostId,
        name: project.name,
        devpostUrl: project.devpostUrl,
        teamMembers: project.teamMembers,
      });

      projectDevpostIdsPerGroup[g].push(project.devpostId);
    }

    for (let m = 0; m < mentors.length; m++) {
      const mentor = mentors[m];
      const assignedJudgeIds = groupsMembers[m]?.judgeIds ?? [];
      const assignedJudgeNames = groupsMembers[m]?.judgeNames ?? [];

      const presentations = projectDevpostIdsPerGroup[m].map(
        (projectDevpostId, index) => ({
          projectName:
            scrapedProjects.find((p) => p.devpostId === projectDevpostId)
              ?.name ?? "Unknown Project",
          projectDevpostId,
          startTime: Date.now() + index * defaultDurationMinutes * 60 * 1000,
          duration: defaultDurationMinutes,
          status: "upcoming" as const,
          timerState: {
            remainingSeconds: defaultDurationMinutes * 60,
            isPaused: false,
          },
        })
      );

      const groupWithProjects: Group = {
        projectDevpostIds: projectDevpostIdsPerGroup[m],
        judgeIds: assignedJudgeIds,
        judgeNames: assignedJudgeNames,
        presentations,
        mentorId: mentor._id,
        mentorName: mentor.name ?? "Unknown Mentor",
      };

      const groupId = groupIdMappings.get(mentor._id);

      if (!groupId) {
        return {
          success: false,
          message: "The system failed to create and find your group.",
        };
      }

      await ctx.runMutation(internal.judging.patchGroup, {
        groupId,
        group: groupWithProjects,
      });
    }

    return {
      success: true,
      message: "Groups created and projects assigned.",
    };
  },
});

async function getGroupsHelper(ctx: QueryCtx) {
  try {
    const user = await getCurrentUser(ctx);

    if (!user) return null;

    if (user.role !== "director" && user.role !== "mentor") {
      return null;
    }

    return await ctx.db.query("groups").collect();
  } catch (err: unknown) {
    console.error("error getting groups:", err);

    return null;
  }
}

export const getGroups = query({
  handler: async (ctx) => {
    return await getGroupsHelper(ctx);
  },
});

export const removeAllGroups = internalMutation({
  handler: async (ctx) => {
    const groups = await ctx.db.query("groups").collect();
    for (const group of groups) {
      await ctx.db.delete(group._id);
    }

    const usersWithGroups = await ctx.db
      .query("users")
      .withIndex("by_groupId")
      .collect();
    for (const user of usersWithGroups) {
      await ctx.db.patch(user._id, { groupId: undefined });
    }

    const scores = await ctx.db.query("scores").collect();

    for (const score of scores) {
      await ctx.db.delete(score._id);
    }

    return { success: true, message: "All groups removed." };
  },
});

export const patchGroup = internalMutation({
  args: { groupId: v.id("groups"), group: groupValidator },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.groupId, args.group);
  },
});

export const createGroup = internalMutation({
  args: { group: groupValidator },
  handler: async (ctx, args) => {
    return await ctx.db.insert("groups", args.group);
  },
});

export const setUserGroupId = internalMutation({
  args: { userId: v.id("users"), groupId: v.id("groups") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { groupId: args.groupId });
  },
});

export const insertProjectWithGroupId = internalMutation({
  args: {
    groupId: v.id("groups"),
    devpostId: v.string(),
    name: v.string(),
    devpostUrl: v.string(),
    teamMembers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("projects", {
      groupId: args.groupId,
      devpostId: args.devpostId,
      name: args.name,
      teamMembers: args.teamMembers,
      devpostUrl: args.devpostUrl,
      hasPresented: false,
    });
  },
});

export const listNonDirectors = internalQuery({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) return null;

    if (user.role !== "director") return null;

    return await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("role"), "director"))
      .collect();
  },
});

export const beginJudging = mutation({
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx);

      if (!user) return { success: false, message: noAuthMsg };

      if (user.role !== "director") {
        return { success: false, message: notDirectorMsg };
      }

      const groups = await getGroupsHelper(ctx);

      if (!groups || groups.length === 0) {
        return {
          success: false,
          message: "Please create the judge groups before starting judging.",
        };
      }

      await ctx.db.patch(process.env.JUDGING_STATUS_ID as Id<"judgingStatus">, {
        active: true,
      });

      return { success: true, message: "Judging has began." };
    } catch (err: unknown) {
      console.error("error starting judging:", err);

      return {
        success: false,
        message: "Unknown error starting judging. Please try again.",
      };
    }
  },
});

export const endJudging = mutation({
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx);

      if (!user) return { success: false, message: noAuthMsg };

      if (user.role !== "director") {
        return { success: false, message: notDirectorMsg };
      }

      await ctx.db.patch(process.env.JUDGING_STATUS_ID as Id<"judgingStatus">, {
        active: false,
      });

      return { success: true, message: "Judging has ended." };
    } catch (err: unknown) {
      console.error("error starting judging:", err);

      return {
        success: false,
        message: "Unknown error ending judging. Please try again.",
      };
    }
  },
});

export const submitScore = mutation({
  args: {
    projectDevpostId: v.string(),
    criteria: v.record(v.string(), v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx);

      if (!user) return { success: false, message: noAuthMsg };

      if (user.role !== "judge") {
        return { success: false, message: notJudgeMsg };
      }

      const project = await ctx.db
        .query("projects")
        .withIndex("by_devpostId", (q) =>
          q.eq("devpostId", args.projectDevpostId)
        )
        .first();

      if (!project)
        return {
          success: false,
          message:
            "This project does not exist. If this is a mistake, contact Michael from the Tech team.",
        };

      if (!project.hasPresented)
        return {
          success: false,
          message:
            "Cannot score a project that hasn't presented yet. Please wait for the presentation to finish.",
        };

      const newScore: Score = {
        projectId: project._id,
        judgeId: user._id,
        criteria: args.criteria,
      };
      const existingScore = await ctx.db
        .query("scores")
        .withIndex("by_projectId_judgeId", (q) =>
          q.eq("projectId", project._id).eq("judgeId", user._id)
        )
        .first();

      if (existingScore) {
        await ctx.db.patch(existingScore._id, newScore);
      } else {
        await ctx.db.insert("scores", newScore);
      }

      return { success: true, message: "Successfully submitted score." };
    } catch (err: unknown) {
      console.error("error submitting score:", err);

      return {
        success: false,
        message: "Unknown error submitting score. Please try again.",
      };
    }
  },
});

export const getGroupById = query({
  args: { groupId: v.optional(v.id("groups")) },
  handler: async (ctx, args) => {
    if (!args.groupId) return null;

    return ctx.db.get(args.groupId);
  },
});

export const getGroupProjects = query({
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx);

      if (!user) return { success: false, message: noAuthMsg, projects: [] };

      if (user.role !== "mentor" && user.role !== "judge") {
        return {
          success: false,
          message: "You must be a mentor or judge to access projects.",
          projects: [],
        };
      }

      if (!user.groupId)
        return {
          success: false,
          message:
            "You have not been assigned any projects. If this is a mistake, contact Michael from the Tech team.",
          projects: [],
        };

      const projects = await ctx.db
        .query("projects")
        .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId!))
        .collect();

      return {
        success: true,
        message: `Successfully retrieved projects for ${user.name ?? "Unknown User"}'s group.`,
        projects,
      };
    } catch (err: unknown) {
      console.error("error getting group projects", err);

      return {
        success: false,
        message: "Error getting group projects. Please try again.",
        projects: [],
      };
    }
  },
});

export const getJudgingStatus = query({
  handler: async (ctx) => {
    return await ctx.db.get(
      process.env.JUDGING_STATUS_ID as Id<"judgingStatus">
    );
  },
});

export const getMyScores = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) return null;

    if (user.role !== "judge") {
      return null;
    }

    const scores = await ctx.db
      .query("scores")
      .withIndex("by_judgeId", (q) => q.eq("judgeId", user._id))
      .collect();

    return scores;
  },
});

export const getAllScores = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) return null;

    const projects = await ctx.db.query("projects").collect();
    const allScores = await ctx.db.query("scores").collect();

    const scoresByProject = allScores.reduce(
      (acc, score) => {
        if (!acc[score.projectId]) {
          acc[score.projectId] = [];
        }
        acc[score.projectId].push(score);
        return acc;
      },
      {} as Record<string, typeof allScores>
    );

    const projectsWithScores = projects.map((project) => ({
      ...project,
      scores: scoresByProject[project._id] || [],
    }));

    return projectsWithScores;
  },
});

export const getGroupProjectPresenting = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) return null;

    if (user.role !== "judge") {
      return null;
    }

    if (!user.groupId) {
      return null;
    }

    const group = await ctx.db.get(user.groupId);

    if (!group) return null;

    if (!group.currentProjectPresenting) return null;

    const project = await ctx.db
      .query("projects")
      .withIndex("by_devpostId", (q) =>
        q.eq("devpostId", group.currentProjectPresenting!)
      )
      .first();

    if (!project) return null;

    return project.name;
  },
});
