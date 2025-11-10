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
  projectId: v.id("projects"),
  judgeId: v.id("users"),
  criteria: v.record(v.string(), v.number()),
});

export const projectValidator = v.object({
  groupId: v.id("groups"),
  devpostId: v.string(),
  name: v.string(),
  teamMembers: v.array(v.string()),
  devpostUrl: v.string(),
  hasPresented: v.boolean(),
});

export const groupValidator = v.object({
  projectDevpostIds: v.array(v.string()),
  judgeIds: v.array(v.id("users")),
  judgeNames: v.array(v.string()),
  presentations: v.array(presentationSlotValidator),
  currentProjectPresenting: v.optional(v.string()),
  mentorId: v.id("users"),
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
  groupId: v.optional(v.id("groups")),
});

export const hierarchyValidator = v.object({
  directors: v.array(v.string()),
  mentors: v.array(v.string()),
  judges: v.array(v.string()),
});

export const judgingStatusValidator = v.object({
  active: v.boolean(),
});
