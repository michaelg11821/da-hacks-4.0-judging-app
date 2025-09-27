import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";

describe("judge groups", () => {
  describe("group creation", () => {
    it("succeeds", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 4", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 5", role: "mentor" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      const result = await asDirector.action(api.judging.createGroups);

      expect(result.success).toBe(true);
      expect(result.groups.length).toBeGreaterThan(0);
    });

    it("each judge has the same judgingSession as their mentor", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
        });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 4", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 5", role: "mentor" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const result = await asDirector.action(api.judging.createGroups);

      await t.run(async (ctx) => {
        for (const group of result.groups) {
          const mentor = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("name"), group.mentorName))
            .unique();

          const judgeIds: Id<"users">[] = group.judges.map((j) => j._id);
          const judges = await Promise.all(
            judgeIds.map((id) =>
              ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("_id"), id))
                .unique()
            )
          );

          if (!mentor) throw new Error("Corresponding mentor not found.");

          for (const judge of judges) {
            if (!judge) throw new Error("Corresponding judge not found.");

            expect(judge.judgingSession).toEqual(mentor.judgingSession);
          }
        }
      });
    });

    it("doesnt succeed when there are no mentors", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
        });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const result = await asDirector.action(api.judging.createGroups);

      expect(result.success).toBe(false);
    });

    it("doesnt succeed when there are no judges", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
        });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { role: "mentor" });
        await ctx.db.insert("users", { role: "mentor" });
      });

      const result = await asDirector.action(api.judging.createGroups);

      expect(result.success).toBe(false);
    });
  });

  describe("group retrieval", () => {
    it("succeeds", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      await asDirector.action(api.judging.createGroups);

      const groups = await asDirector.query(api.judging.getGroups);

      expect(groups).not.toBeNull();
      expect(groups!.length).toBeGreaterThan(0);
    });

    it("return an empty array when groups havent been created", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { name: "Judge 1", role: "judge" });
        await ctx.db.insert("users", { name: "Judge 2", role: "judge" });
        await ctx.db.insert("users", { name: "Judge 3", role: "judge" });
        await ctx.db.insert("users", { name: "Judge 4", role: "judge" });
        await ctx.db.insert("users", { name: "Judge 5", role: "judge" });
        await ctx.db.insert("users", { name: "Judge 6", role: "judge" });
        await ctx.db.insert("users", { name: "Judge 7", role: "judge" });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      const groups = await asDirector.query(api.judging.getGroups);

      expect(groups).not.toBeNull();
      expect(groups!.length).toBe(0);
    });
  });
});

describe("judging status", () => {
  describe("starting judging", () => {
    it("succeeds", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
          judgingSession: {
            projects: [],
            judges: [],
            presentations: [],
            isActive: false,
            mentorName: "Director",
          },
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 4", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 5", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 6", role: "mentor" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      await asDirector.action(api.judging.createGroups);

      const result = await asDirector.mutation(api.judging.beginJudging, {
        cursor: null,
        numItems: 100,
      });

      expect(result.success).toBe(true);
    });

    it("all judgingSessions are active after starting", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
          judgingSession: {
            projects: [],
            judges: [],
            presentations: [],
            isActive: false,
            mentorName: "Director",
          },
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 4", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 5", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 6", role: "mentor" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      await asDirector.action(api.judging.createGroups);

      await asDirector.mutation(api.judging.beginJudging, {
        cursor: null,
        numItems: 100,
      });

      const mockUsers = await t.run(async (ctx) => {
        return await ctx.db.query("users").collect();
      });

      for (const mockUser of mockUsers) {
        if (mockUser.judgingSession === undefined)
          throw new Error("There was an error creating the judge groups.");

        expect(mockUser.judgingSession.isActive).toEqual(true);
      }
    });

    it("fails when groups are not created", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
          judgingSession: {
            projects: [],
            judges: [],
            presentations: [],
            isActive: false,
            mentorName: "Director",
          },
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 4", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 5", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 6", role: "mentor" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      const result = await asDirector.mutation(api.judging.beginJudging, {
        cursor: null,
        numItems: 100,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("ending judging", () => {
    it("succeeds", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
          judgingSession: {
            projects: [],
            judges: [],
            presentations: [],
            isActive: false,
            mentorName: "Director",
          },
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      await asDirector.action(api.judging.createGroups);

      await asDirector.mutation(api.judging.beginJudging, {
        cursor: null,
        numItems: 100,
      });

      const result = await asDirector.mutation(api.judging.endJudging, {
        cursor: null,
        numItems: 100,
      });

      expect(result.success).toBe(true);
    });

    it("all judgingSessions are inactive after ending", async () => {
      const t = convexTest(schema, modules);

      const directorId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          role: "director",
          judgingSession: {
            projects: [],
            judges: [],
            presentations: [],
            isActive: false,
            mentorName: "Director",
          },
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert("users", { name: "Mentor 1", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 2", role: "mentor" });
        await ctx.db.insert("users", { name: "Mentor 3", role: "mentor" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
        await ctx.db.insert("users", { role: "judge" });
      });

      const asDirector = t.withIdentity({
        subject: directorId,
        role: "director",
      });

      await asDirector.action(api.judging.createGroups);

      await asDirector.mutation(api.judging.beginJudging, {
        cursor: null,
        numItems: 100,
      });

      await asDirector.mutation(api.judging.endJudging, {
        cursor: null,
        numItems: 100,
      });

      const mockUsers = await t.run(async (ctx) => {
        return await ctx.db.query("users").collect();
      });

      for (const mockUser of mockUsers) {
        if (mockUser.judgingSession === undefined)
          throw new Error("There was an error creating the judge groups.");

        expect(mockUser.judgingSession.isActive).toEqual(false);
      }
    });
  });
});
