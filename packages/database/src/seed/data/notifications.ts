import { NewNotificationPreference } from "../../schema/notifications";
import { stableId } from "../utils";
import { v1LaunchProject, acmePlatformProject, startupMvpProject } from "./projects";
import { adminUser, johnDoe, janeSmith, mikeWilson, sarahChen, davidKim } from "./users";

export interface SeedNotificationPreference extends NewNotificationPreference {
  id: string;
}

export const notificationPreferences: SeedNotificationPreference[] = [
  // Primary project notification preferences
  {
    id: stableId("notif-pref-admin"),
    userId: adminUser.id,
    projectId: v1LaunchProject.id,
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
    projectId: v1LaunchProject.id,
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
    projectId: v1LaunchProject.id,
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
    projectId: v1LaunchProject.id,
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
    projectId: v1LaunchProject.id,
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
    projectId: v1LaunchProject.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: true,
    commentMentioned: true,
  },

  // Acme project preferences
  {
    id: stableId("notif-pref-john-acme"),
    userId: johnDoe.id,
    projectId: acmePlatformProject.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: true, // Admin in this project
    commentCreated: true,
    commentMentioned: true,
  },
  {
    id: stableId("notif-pref-mike-acme"),
    userId: mikeWilson.id,
    projectId: acmePlatformProject.id,
    emailNotifications: false,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: true,
    commentMentioned: true,
  },

  // Startup project preferences
  {
    id: stableId("notif-pref-sarah-startup"),
    userId: sarahChen.id,
    projectId: startupMvpProject.id,
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
    projectId: startupMvpProject.id,
    emailNotifications: true,
    issueAssigned: true,
    issueMentioned: true,
    issueUpdated: false,
    commentCreated: true,
    commentMentioned: true,
  },
];
