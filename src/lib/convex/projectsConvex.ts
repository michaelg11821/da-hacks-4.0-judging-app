import { v } from "convex/values";
import { noAuthMsg, notDirectorMsg } from "../constants/errorMessages";
import { internalMutation, query } from "./_generated/server";
import { getCurrentUser } from "./user";
import { projectValidator } from "./validators";

export const removeAllProjects = internalMutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) return { success: false, message: noAuthMsg };

    if (user.role !== "director") {
      return { success: false, message: notDirectorMsg };
    }

    const projects = await ctx.db.query("projects").collect();

    await Promise.all(projects.map((project) => ctx.db.delete(project._id)));

    return { success: true, message: "All projects removed." };
  },
});

export const bulkInsertProjects = internalMutation({
  args: {
    devpostProjects: v.array(projectValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) return { success: false, message: noAuthMsg };

    if (user.role !== "director") {
      return { success: false, message: notDirectorMsg };
    }

    const { devpostProjects } = args;

    for (const project of devpostProjects) {
      await ctx.db.insert("projects", {
        devpostId: project.devpostId,
        devpostUrl: project.devpostUrl,
        name: project.name,
        scores: project.scores,
        teamMembers: project.teamMembers,
        hasPresented: false,
      });
    }

    return { success: true, message: "Successfully inserted all projects." };
  },
});

export const listAllProjects = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) return null;

    if (user.role !== "director") {
      return null;
    }

    return await ctx.db.query("projects").collect();
  },
});
