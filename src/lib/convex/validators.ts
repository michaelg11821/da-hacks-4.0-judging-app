import { v } from "convex/values";

export const presentationSlotValidator = v.object({
  projectName: v.string(),
  projectDevpostId: v.string(),
  startTime: v.number(),
  duration: v.number(),
  status: v.union(
    v.literal("upcoming"),
    v.literal("presenting"),
    v.literal("completed")
  ),
  timerState: v.object({
    remainingSeconds: v.number(),
    isPaused: v.boolean(),
    startedAt: v.optional(v.number()),
  }),
});

export const scoreValidator = v.object({
  judgeId: v.id("users"),
  criteria: v.record(v.string(), v.number()),
});

export const projectValidator = v.object({
  devpostId: v.string(),
  name: v.string(),
  teamMembers: v.array(v.string()),
  devpostUrl: v.string(),
  scores: v.array(scoreValidator),
  hasPresented: v.boolean(),
});

export const judgingSessionValidator = v.object({
  projects: v.array(
    v.object({
      devpostId: v.string(),
      name: v.string(),
      teamMembers: v.array(v.string()),
      devpostUrl: v.string(),
    })
  ),
  judges: v.array(v.string()),
  presentations: v.array(presentationSlotValidator),
  isActive: v.boolean(),
  currentProjectPresenting: v.optional(v.string()),
  mentorName: v.string(),
});

export const userValidator = v.object({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  role: v.string(),
  judgingSession: v.optional(judgingSessionValidator),
});

export const hierarchyValidator = v.object({
  directors: v.array(v.string()),
  mentors: v.array(v.string()),
  judges: v.array(v.string()),
});
