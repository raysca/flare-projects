import { NewNotificationPreference } from "../../schema/notifications";
import { stableId } from "../utils";
import { primaryWorkspace, acmeWorkspace, startupWorkspace } from "./workspaces";
import { adminUser, johnDoe, janeSmith, mikeWilson, sarahChen, davidKim } from "./users";

export interface SeedNotificationPreference extends NewNotificationPreference {
  id: string;
}

export const notificationPreferences: SeedNotificationPreference[] = [
  // Primary workspace notification preferences
  {
    id: stableId("notif-pref-admin"),
    userId: adminUser.id,
    workspaceId: primaryWorkspace.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: true, // Admin wants all updates
    commentCreated: true,
    commentMentioned: true,
  },
  {
    id: stableId("notif-pref-john"),
    userId: johnDoe.id,
    workspaceId: primaryWorkspace.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: true,
    commentMentioned: true,
  },
  {
    id: stableId("notif-pref-jane"),
    userId: janeSmith.id,
    workspaceId: primaryWorkspace.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: false, // Only wants mentions
    commentMentioned: true,
  },
  {
    id: stableId("notif-pref-mike"),
    userId: mikeWilson.id,
    workspaceId: primaryWorkspace.id,
    emailNotifications: false, // Prefers in-app only
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: true,
    commentMentioned: true,
  },
  {
    id: stableId("notif-pref-sarah"),
    userId: sarahChen.id,
    workspaceId: primaryWorkspace.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: true, // Product manager wants updates
    commentCreated: true,
    commentMentioned: true,
  },
  {
    id: stableId("notif-pref-david"),
    userId: davidKim.id,
    workspaceId: primaryWorkspace.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: true,
    commentMentioned: true,
  },

  // Acme workspace preferences
  {
    id: stableId("notif-pref-john-acme"),
    userId: johnDoe.id,
    workspaceId: acmeWorkspace.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: true, // Admin in this workspace
    commentCreated: true,
    commentMentioned: true,
  },
  {
    id: stableId("notif-pref-mike-acme"),
    userId: mikeWilson.id,
    workspaceId: acmeWorkspace.id,
    emailNotifications: false,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: true,
    commentMentioned: true,
  },

  // Startup workspace preferences
  {
    id: stableId("notif-pref-sarah-startup"),
    userId: sarahChen.id,
    workspaceId: startupWorkspace.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: true,
    commentCreated: true,
    commentMentioned: true,
  },
  {
    id: stableId("notif-pref-jane-startup"),
    userId: janeSmith.id,
    workspaceId: startupWorkspace.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: true,
    commentMentioned: true,
  },
];
