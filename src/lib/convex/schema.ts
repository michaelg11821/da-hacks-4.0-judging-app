import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import {
  hierarchyValidator,
  projectValidator,
  userValidator,
} from "./validators";

const schema = defineSchema({
  ...authTables,
  users: defineTable(userValidator)
    .index("email", ["email"])
    .index("by_role", ["role"]),
  hierarchy: defineTable(hierarchyValidator),
  projects: defineTable(projectValidator)
    .index("by_devpostId", ["devpostId"])
    .index("by_hasPresented", ["hasPresented"]),
});

export default schema;
