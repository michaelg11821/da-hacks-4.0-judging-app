import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import {
  groupValidator,
  hierarchyValidator,
  judgingStatusValidator,
  projectValidator,
  scoreValidator,
  userValidator,
} from "./validators";

const schema = defineSchema({
  ...authTables,
  users: defineTable(userValidator)
    .index("email", ["email"])
    .index("by_role", ["role"])
    .index("by_groupId", ["groupId"]),
  hierarchy: defineTable(hierarchyValidator),
  projects: defineTable(projectValidator)
    .index("by_devpostId", ["devpostId"])
    .index("by_groupId", ["groupId"])
    .index("by_groupId_hasPresented", ["groupId", "hasPresented"]),
  groups: defineTable(groupValidator),
  scores: defineTable(scoreValidator)
    .index("by_projectId", ["projectId"])
    .index("by_judgeId", ["judgeId"])
    .index("by_projectId_judgeId", ["projectId", "judgeId"]),
  judgingStatus: defineTable(judgingStatusValidator),
});

export default schema;
