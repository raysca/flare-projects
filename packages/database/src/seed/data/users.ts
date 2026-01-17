import { NewUser } from "../../schema/users";
import { stableId, DEV_PASSWORD_HASH } from "../utils";

export interface SeedUser extends NewUser {
  id: string;
}

export const users: SeedUser[] = [
  {
    id: stableId("admin-user"),
    email: "admin@linearflow.dev",
    passwordHash: DEV_PASSWORD_HASH,
    name: "Alex Admin",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    emailVerified: true,
    isActive: true,
  },
  {
    id: stableId("john-doe"),
    email: "john@linearflow.dev",
    passwordHash: DEV_PASSWORD_HASH,
    name: "John Doe",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
    emailVerified: true,
    isActive: true,
  },
  {
    id: stableId("jane-smith"),
    email: "jane@linearflow.dev",
    passwordHash: DEV_PASSWORD_HASH,
    name: "Jane Smith",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
    emailVerified: true,
    isActive: true,
  },
  {
    id: stableId("mike-wilson"),
    email: "mike@linearflow.dev",
    passwordHash: DEV_PASSWORD_HASH,
    name: "Mike Wilson",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
    emailVerified: true,
    isActive: true,
  },
  {
    id: stableId("sarah-chen"),
    email: "sarah@linearflow.dev",
    passwordHash: DEV_PASSWORD_HASH,
    name: "Sarah Chen",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    emailVerified: true,
    isActive: true,
  },
  {
    id: stableId("david-kim"),
    email: "david@linearflow.dev",
    passwordHash: DEV_PASSWORD_HASH,
    name: "David Kim",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
    emailVerified: true,
    isActive: true,
  },
  {
    id: stableId("emily-brown"),
    email: "emily@linearflow.dev",
    passwordHash: DEV_PASSWORD_HASH,
    name: "Emily Brown",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
    emailVerified: false,
    isActive: true,
  },
  {
    id: stableId("inactive-user"),
    email: "inactive@linearflow.dev",
    passwordHash: DEV_PASSWORD_HASH,
    name: "Inactive User",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=inactive",
    emailVerified: true,
    isActive: false,
  },
];

// Helper to get user by name
export function getUserByName(name: string): SeedUser {
  const user = users.find((u) => u.name.toLowerCase().includes(name.toLowerCase()));
  if (!user) throw new Error(`User not found: ${name}`);
  return user;
}

// Commonly referenced users
export const adminUser = users[0];
export const johnDoe = users[1];
export const janeSmith = users[2];
export const mikeWilson = users[3];
export const sarahChen = users[4];
export const davidKim = users[5];
export const emilyBrown = users[6];
