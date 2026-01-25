export type DashboardStats = {
    assigned: Record<string, number>;
    created: {
        total: number;
        open: number;
    };
    watching: number;
    completed: {
        thisWeek: number;
        lastWeek: number;
    };
};

export type DashboardOverdueIssue = {
    id: string;
    title: string;
    number: number;
    dueDate: string; // ISO date string
    project: {
        id: string;
        name: string;
        identifier: string;
    };
    daysOverdue: number;
};

export type DashboardIssue = {
    id: string;
    number: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    project: {
        id: string;
        name: string;
        identifier: string;
    };
    assignee: {
        id: string;
        name: string;
        avatarUrl: string | null;
    } | null;
};

export type DashboardIssuesResponse = {
    issues: DashboardIssue[];
    total: number;
    hasMore: boolean;
};

export type DashboardActivity = {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    metadata: string | null;
    issue: {
        id: string;
        number: number;
        title: string;
    } | null;
    project: {
        identifier: string;
    } | null;
};

export type DashboardMention = {
    id: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    message: string;
    issue: {
        id: string;
        number: number;
        title: string;
    } | null;
    project: {
        identifier: string;
    } | null;
};
