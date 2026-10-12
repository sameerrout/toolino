export type DashboardTab =
  | 'overview'
  | 'visitors'
  | 'users'
  | 'logins'
  | 'tools'
  | 'pageviews'
  | 'messages'
  | 'system';

export type DateFilterOption =
  | 'today'
  | 'yesterday'
  | '7days'
  | '30days'
  | 'this_month'
  | 'all'
  | 'custom';

export interface OverviewStats {
  activeVisitors: {
    total: number;
    anonymous: number;
    authenticated: number;
    sessions: VisitorSessionItem[];
  };
  totalRegisteredUsers: number;
  newRegistrationsToday: number;
  successfulLoginsToday: number;
  pageViewsToday: number;
  toolExecutionsToday: number;
  totalToolExecutionsPeriod: number;
  distinctToolsUsed: number;
  mostPopularTools: ToolUsageItem[];
  recentSuccessfulLogins: LoginEventItem[];
  recentToolActivity: ToolExecutionItem[];
  dailyTrends: { date: string; pageViews: number; toolExecutions: number }[];
}

export interface VisitorSessionItem {
  sessionId: string;
  visitorHash: string;
  maskedIp: string;
  startTime: string;
  lastActivityTime: string;
  currentPath: string;
  isAuthenticated: boolean;
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  status: 'active' | 'idle' | 'expired';
}

export interface RegisteredUserItem {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authProvider: string;
  role: string;
  isManager: boolean;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  emailVerified: boolean;
  status: string;
}

export interface LoginEventItem {
  id: string;
  userId?: string;
  email: string;
  timestamp: string;
  method: 'google' | 'email';
  eventType: 'login' | 'signup' | 'logout' | 'failed_login';
  status: 'success' | 'failure';
  failureReason?: string;
  sessionId?: string;
  maskedIp?: string;
}

export interface ToolUsageItem {
  toolSlug: string;
  toolName: string;
  category?: string;
  totalExecutions: number;
  completedCount: number;
  failedCount: number;
  uniqueUsers: number;
  uniqueAnonymous: number;
  lastUsedAt?: string;
  percentage: number;
}

export interface ToolExecutionItem {
  id: string;
  toolSlug: string;
  toolName: string;
  userId?: string;
  visitorSessionId?: string;
  timestamp: string;
  status: 'initiated' | 'completed' | 'failed';
  durationMs?: number;
  errorMessage?: string;
}

export interface PageViewItem {
  path: string;
  views: number;
  uniqueSessions: number;
  authenticatedVisits: number;
  anonymousVisits: number;
  percentage: number;
}

export interface PageVisitItem {
  id: string;
  timestamp: string;
  visitorHash: string;
  maskedIp: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  visitorSessionId?: string;
}

export interface ContactMessageItem {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: 'unread' | 'read' | 'replied' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface SystemStatusData {
  isDatabaseConnected: boolean;
  databaseStatus: 'connected' | 'query_failed' | 'unconfigured';
  databaseError?: string;
  storageProvider: string;
  folderName: string;
  targetAccount: string;
  authorizedManagers: string[];
  authenticatedAs: string;
  serverTimestamp: string;
  nodeEnv: string;
}

export interface FullDashboardData {
  overview: OverviewStats;
  liveVisitors: {
    totalActive: number;
    anonymousActive: number;
    authenticatedActive: number;
    sessions: VisitorSessionItem[];
  };
  registeredUsers: {
    totalCount: number;
    users: RegisteredUserItem[];
  };
  loginHistory: {
    totalCount: number;
    events: LoginEventItem[];
  };
  toolUsage: {
    summary: {
      totalExecutions: number;
      completedExecutions: number;
      failedExecutions: number;
      distinctToolsUsed: number;
      mostPopularTool?: { toolSlug: string; toolName: string; count: number };
      uniqueUsersCount: number;
      uniqueAnonymousCount: number;
    };
    tools: ToolUsageItem[];
    recentExecutions: ToolExecutionItem[];
  };
  pageViews: {
    totalViews: number;
    uniqueSessionsCount: number;
    pages: PageViewItem[];
    dailyTrends: { date: string; views: number }[];
    recentVisits: PageVisitItem[];
  };
  contactMessages: {
    total: number;
    unread: number;
    messages: ContactMessageItem[];
  };
  systemStatus: SystemStatusData;
  authenticatedAs: string;
}
