# LinearFlow - Product Requirements Document

## Project Overview

**Project Name:** LinearFlow  
**Vision:** A high-performance, real-time issue tracking and project management platform built entirely on Cloudflare's edge infrastructure, delivering sub-50ms response times globally.

**Core Differentiators:**
- Edge-native architecture for global low-latency access
- AI-powered issue classification, search, and automation
- Real-time collaboration without traditional backend infrastructure
- Serverless cost model that scales to zero

---

## Technical Architecture

### Cloudflare Services Utilization

**D1 (SQLite)** - Primary data store
- Issues, projects, users, comments, cycles
- Optimized for read-heavy workloads with intelligent caching
- Global replication for low-latency reads

**Durable Objects** - Real-time state management
- Workspace collaboration (presence, live cursors, typing indicators)
- Issue-level collaboration (real-time updates, optimistic UI sync)
- Team activity feeds
- WebSocket connection management

**R2** - Object storage
- File attachments (images, PDFs, documents)
- User avatars and team logos
- Export archives (CSV, JSON)
- Issue template storage

**Vectorize** - Semantic search
- Issue content embeddings for intelligent search
- Similar issue detection
- Automatic issue clustering by topic
- Related issue suggestions

**Workers AI** - Intelligence layer
- Issue classification (bug, feature, improvement)
- Priority prediction based on content
- Automatic label suggestion
- Issue description enhancement
- Sentiment analysis for customer feedback
- Smart issue assignment (based on historical data)

**KV** - Edge caching
- User sessions and auth tokens
- Frequently accessed workspace metadata
- Real-time presence data (backup/hydration)
- Rate limiting counters

**Queues** - Async processing
- Email notifications
- Webhook deliveries
- Batch AI processing
- Analytics aggregation
- Search index updates

**Analytics Engine** - Observability
- Issue velocity metrics
- Team performance analytics
- Search query analytics
- Error tracking

---

## Core Features & Functionality



### 2. Issues

**Core Attributes:**
- Title, description (rich text with markdown)
- Status (Backlog, Todo, In Progress, In Review, Done, Canceled)
- Priority (Urgent, High, Medium, Low, No Priority)
- Assignee, Reporter, Labels
- Parent/child relationships (sub-issues)
- Estimates, due dates
- Project association
- Cycle association

**AI-Powered Features:**
- **Auto-classification:** Analyze issue description to suggest type, priority, labels
- **Smart assignment:** Recommend assignees based on historical data and availability
- **Duplicate detection:** Use Vectorize to find similar existing issues
- **Description enhancement:** AI suggests improvements to vague descriptions
- **Label suggestion:** Auto-suggest relevant labels based on content

**Real-time Features:**
- Live issue updates across all connected clients
- Optimistic UI with conflict resolution
- Typing indicators in comments
- Live status/assignee changes
- Presence indicators (who's viewing)

### 3. Projects

**Features:**
- Group related issues
- Project timelines and milestones
- Progress tracking (completion percentage)
- Project roadmaps
- Custom project workflows

**AI Enhancement:**
- Project health predictions based on velocity
- Risk detection (overdue issues, blocked tasks)
- Timeline suggestions based on issue estimates

### 4. Cycles (Sprints)

**Features:**
- Time-boxed work periods (weekly, bi-weekly, monthly)
- Automatic cycle rollover
- Cycle analytics (completion rate, velocity)
- Cycle planning views

**AI Enhancement:**
- Capacity planning recommendations
- Cycle scope suggestions based on team velocity
- Burndown predictions

### 5. Views & Filters

**Built-in Views:**
- Active issues (assigned to me)
- All issues
- Created by me
- Subscribed
- Custom views with saved filters

**Filter Capabilities:**
- By status, priority, assignee, labels, project, cycle
- Date ranges (created, updated, due)
- Text search with semantic understanding
- Compound filters with AND/OR logic

**AI-Powered Search:**
- Natural language queries ("show me urgent bugs from last week")
- Semantic search using Vectorize
- Related issue suggestions
- Search result ranking based on relevance + context

### 6. Comments & Activity

**Features:**
- Rich text comments with markdown, mentions, code blocks
- File attachments via R2
- Activity timeline per issue
- @mentions with notifications
- Emoji reactions

**Real-time:**
- Live comment updates
- Typing indicators
- Read receipts

### 7. Notifications

**Channels:**
- In-app notifications
- Email (via Queues for async delivery)
- Webhook integrations

**Triggers:**
- Issue assigned
- Mentioned in comment
- Issue updated (configurable)
- Status changes
- Due date reminders

### 8. Roadmap

**Features:**
- Visual timeline of projects and milestones
- Drag-and-drop timeline adjustments
- Quarterly/yearly views
- Progress tracking

**AI Enhancement:**
- Timeline conflict detection
- Resource allocation suggestions

### 9. Insights & Analytics

**Metrics:**
- Issue velocity (created vs. completed)
- Cycle completion rates
- Time in status distribution
- Team productivity metrics
- Label distribution

**Powered by Analytics Engine:**
- Real-time dashboard updates
- Historical trend analysis
- Custom report builder

**AI-Generated Insights:**
- Bottleneck detection
- Productivity trends
- Anomaly detection (unusual spike in bugs)

### 10. Integrations

**GitHub Integration:**
- Link issues to PRs and commits
- Auto-update issue status from PR events
- Branch name generation from issue

**Slack Integration:**
- Issue creation from Slack
- Notifications to channels
- Unfurl issue links

**API:**
- GraphQL API for all operations
- Webhook events
- OAuth for third-party apps

---

## Milestones & Tasks

### **Milestone 1: Foundation (Weeks 1-3)**

**Objective:** Core infrastructure, authentication, and basic CRUD operations

#### Tasks:

**M1.1: Project Setup & Infrastructure** *(No dependencies)*
- Set up Bun monorepo with workspaces
- Configure Drizzle with D1
- Set up Wrangler configuration for all services
- Create TypeScript path aliases
- Configure ESLint and Prettier
- *Duration: 2 days*

**M1.2: Database Schema Design** *(Depends on: M1.1)*
- Design Drizzle schema for users, projects (with members)
- Design schema for issues, projects, cycles, labels
- Design schema for comments, attachments, notifications
- Create initial migrations
- Set up seed data for development
- *Duration: 3 days*

**M1.3: Authentication System** *(Depends on: M1.2)*
- Implement email/password auth with D1
- Session management with KV
- JWT token generation and validation
- Password hashing (use Web Crypto API)
- Auth middleware for Hono
- *Duration: 3 days*

**M1.4: User & Project Management** *(Depends on: M1.3)*
- User CRUD operations
- Project creation and settings
- Project membership with flexible roles (e.g. "Designer", "Lead")
- User invitation system
- *Duration: 4 days*

**M1.5: Basic Frontend Setup** *(Depends on: M1.1)*
- Vite app structure with Tanstack Router & Query
- Authentication pages (login, signup)
- Layout components (sidebar, header)
- Basic routing structure
- *Duration: 3 days*

---

### **Milestone 2: Core Issue Management (Weeks 4-6)**

**Objective:** Full issue CRUD, projects, and basic filtering

#### Tasks:

**M2.1: Issue Data Model & API** *(Depends on: M1.4)*
- Issue CRUD endpoints (create, read, update, delete)
- Status transition logic
- Priority management
- Assignee and reporter handling
- Label association
- Parent/child issue relationships
- *Duration: 4 days*

**M2.2: Project Management** *(Depends on: M2.1)*
- Project CRUD operations
- Issue-to-project association
- Project timeline calculations
- Progress tracking (completion %)
- Project views and filtering
- *Duration: 3 days*

**M2.3: Cycle Management** *(Depends on: M2.1)*
- Cycle CRUD operations
- Issue-to-cycle association
- Automatic cycle rollover logic
- Cycle analytics (velocity, completion)
- Cycle planning views
- *Duration: 3 days*

**M2.4: Issue Frontend** *(Depends on: M2.1, M1.5)*
- Issue list view with table/board layouts
- Issue detail modal/page
- Issue creation form with rich text editor
- Issue editing with inline updates
- Status/priority/assignee dropdowns
- Keyboard shortcuts (Linear-style)
- *Duration: 5 days*

**M2.5: Filtering & Views** *(Depends on: M2.4)*
- Advanced filter builder UI
- Filter persistence in URL params
- Saved custom views
- Preset views (Active, All, Created by me)
- Filter combinations (AND/OR)
- *Duration: 4 days*

---

### **Milestone 3: Real-time Collaboration (Weeks 7-8)**

**Objective:** WebSocket infrastructure and live updates

#### Tasks:

**M3.1: Durable Objects Setup** *(Depends on: M1.1)*
- WorkspaceDO for workspace-level collaboration
- IssueDO for issue-level real-time updates
- WebSocket connection management
- Broadcast utilities for state sync
- Hibernatable WebSocket configuration
- *Duration: 3 days*

**M3.2: Real-time Issue Updates** *(Depends on: M3.1, M2.1)*
- Live issue field updates (status, assignee, priority)
- Optimistic UI with conflict resolution
- WebSocket message protocol design
- Presence tracking (who's viewing issue)
- Multi-user concurrency handling
- *Duration: 4 days*

**M3.3: Live Comments** *(Depends on: M3.2)*
- Comment CRUD with real-time sync
- Typing indicators in comment threads
- Live comment updates across clients
- @mention detection and notifications
- Emoji reactions with live updates
- *Duration: 3 days*

**M3.4: Frontend WebSocket Integration** *(Depends on: M3.2, M2.4)*
- WebSocket client setup
- Connection state management
- Reconnection logic with exponential backoff
- Message queue for offline support
- Real-time UI updates with React state
- *Duration: 3 days*

---

### **Milestone 4: AI Integration (Weeks 9-10)**

**Objective:** Workers AI and Vectorize for intelligent features

#### Tasks:

**M4.1: Vectorize Setup** *(Depends on: M1.1)*
- Create Vectorize index for issues
- Embedding generation workflow
- Vector upsert on issue create/update
- Similarity search implementation
- *Duration: 2 days*

**M4.2: AI-Powered Classification** *(Depends on: M4.1, M2.1)*
- Issue type classification (bug/feature/improvement)
- Priority prediction based on description
- Label suggestion using Workers AI
- Auto-classification on issue creation
- Confidence scores for suggestions
- *Duration: 4 days*

**M4.3: Semantic Search** *(Depends on: M4.1, M2.5)*
- Natural language query processing
- Hybrid search (keyword + semantic)
- Similar issue detection
- Related issue suggestions
- Search result ranking with context
- *Duration: 4 days*

**M4.4: Smart Assignment** *(Depends on: M4.2)*
- Historical assignment pattern analysis
- Assignee recommendation based on issue content
- Team member availability consideration
- Workload balancing suggestions
- *Duration: 3 days*

**M4.5: AI Frontend Features** *(Depends on: M4.2, M4.3, M2.4)*
- AI suggestion UI in issue creation
- Semantic search input with preview
- Similar issues panel
- One-click AI label/priority application
- Loading states for AI operations
- *Duration: 3 days*

---

### **Milestone 5: File Management & Attachments (Week 11)**

**Objective:** R2 integration for file uploads

#### Tasks:

**M5.1: R2 Setup & Upload API** *(Depends on: M1.1)*
- R2 bucket configuration
- Presigned URL generation for uploads
- Direct-to-R2 upload from frontend
- File metadata storage in D1
- File type validation and size limits
- *Duration: 2 days*

**M5.2: Attachment Management** *(Depends on: M5.1, M2.1)*
- Issue attachment association
- Attachment deletion with R2 cleanup
- Download endpoint with auth
- Attachment preview for images
- Thumbnail generation for images
- *Duration: 3 days*

**M5.3: Avatar & Media Management** *(Depends on: M5.1)*
- User avatar uploads
- Workspace logo uploads
- Image optimization and resizing
- CDN delivery via R2 public URLs
- *Duration: 2 days*

**M5.4: Frontend Upload UI** *(Depends on: M5.2, M2.4)*
- Drag-and-drop file upload
- Upload progress indicators
- Image paste support in comments
- Attachment preview in issue detail
- File list management UI
- *Duration: 3 days*

---

### **Milestone 6: Notifications & Activity (Week 12)**

**Objective:** Notification system with Queue-based delivery

#### Tasks:

**M6.1: Activity Logging** *(Depends on: M2.1)*
- Activity event capture (issue updates, comments)
- Activity timeline per issue
- User activity feed
- Activity filtering and pagination
- *Duration: 2 days*

**M6.2: Notification System** *(Depends on: M6.1)*
- Notification data model in D1
- Notification generation logic
- In-app notification storage
- Notification preferences per user
- Mark as read/unread functionality
- *Duration: 3 days*

**M6.3: Queue-Based Email Delivery** *(Depends on: M6.2)*
- Cloudflare Queue setup for emails
- Email notification consumer
- Email templates (HTML + plaintext)
- SMTP configuration (e.g., Resend, Mailgun)
- Batch email processing
- *Duration: 3 days*

**M6.4: Frontend Notifications** *(Depends on: M6.2, M1.5)*
- Notification dropdown in header
- Real-time notification updates
- Notification grouping and categorization
- Click-through to related issues
- Notification settings page
- *Duration: 3 days*

---

### **Milestone 7: Advanced Features (Weeks 13-14)**

**Objective:** Roadmap, insights, and keyboard navigation

#### Tasks:

**M7.1: Roadmap View** *(Depends on: M2.2)*
- Timeline visualization component
- Project milestone mapping
- Drag-and-drop timeline adjustments
- Quarterly/yearly view toggles
- Progress indicators on timeline
- *Duration: 4 days*

**M7.2: Analytics Engine Integration** *(Depends on: M2.1)*
- Analytics Engine setup for metrics
- Issue velocity tracking
- Cycle completion analytics
- Time-in-status distribution
- Team productivity metrics
- *Duration: 3 days*

**M7.3: Insights Dashboard** *(Depends on: M7.2)*
- Dashboard page with key metrics
- Chart components (velocity, burndown)
- Custom date range filters
- Export analytics data
- AI-generated insights display
- *Duration: 4 days*

**M7.4: Keyboard Shortcuts** *(Depends on: M2.4)*
- Global shortcut handler (cmd+k for command palette)
- Issue navigation shortcuts (j/k, enter to open)
- Quick actions (c for create, / for search)
- Status/priority shortcuts (1-5 for priority)
- Shortcut help modal
- *Duration: 3 days*

---

### **Milestone 8: Polish & Performance (Weeks 15-16)**

**Objective:** Optimization, error handling, and UX refinement

#### Tasks:

**M8.1: Performance Optimization** *(Depends on: All previous)*
- D1 query optimization with indexes
- KV caching strategy for hot paths
- R2 CDN configuration
- Frontend code splitting and lazy loading
- Image optimization with next/image
- *Duration: 3 days*

**M8.2: Error Handling & Validation** *(Depends on: All previous)*
- Comprehensive error boundaries in React
- API error responses with proper status codes
- Input validation with Zod schemas
- User-friendly error messages
- Retry logic for transient failures
- *Duration: 3 days*

**M8.3: Loading States & Skeletons** *(Depends on: M1.5)*
- Skeleton screens for all major views
- Loading spinners for async operations
- Optimistic UI for all mutations
- Progressive enhancement patterns
- *Duration: 2 days*

**M8.4: Mobile Responsiveness** *(Depends on: M1.5)*
- Mobile-first CSS adjustments
- Touch-friendly UI components
- Mobile navigation patterns
- Responsive table/board views
- *Duration: 3 days*

**M8.5: Accessibility Audit** *(Depends on: All previous)*
- Keyboard navigation testing
- Screen reader compatibility
- ARIA labels and roles
- Color contrast compliance
- Focus management
- *Duration: 2 days*

---

### **Milestone 9: Integrations (Weeks 17-18)**

**Objective:** GitHub, Slack, and API access

#### Tasks:

**M9.1: GraphQL API Setup** *(Depends on: M1.1)*
- GraphQL schema definition
- GraphQL server setup (yoga-graphql or similar)
- Query/mutation resolvers
- Authentication for API
- Rate limiting
- *Duration: 4 days*

**M9.2: GitHub Integration** *(Depends on: M2.1, M9.1)*
- OAuth flow for GitHub
- Link issues to PRs/commits
- Auto-update issue status from PR events
- Branch name generation from issue ID
- Webhook handler for GitHub events
- *Duration: 4 days*

**M9.3: Slack Integration** *(Depends on: M2.1, M9.1)*
- Slack OAuth flow
- Issue creation from Slack commands
- Notification posting to Slack channels
- Issue link unfurling
- Slash commands for quick actions
- *Duration: 3 days*

**M9.4: Webhook System** *(Depends on: M6.1)*
- Webhook configuration per workspace
- Event subscription management
- Queue-based webhook delivery
- Retry logic with exponential backoff
- Webhook signature verification
- *Duration: 3 days*

---

### **Milestone 10: Launch Prep (Weeks 19-20)**

**Objective:** Documentation, testing, and deployment

#### Tasks:

**M10.1: Documentation** *(Depends on: All previous)*
- API documentation (GraphQL schema docs)
- User guide for key features
- Admin guide for workspace setup
- Integration guides (GitHub, Slack)
- Developer documentation for self-hosting
- *Duration: 3 days*

**M10.2: Testing Suite** *(Depends on: All previous)*
- Unit tests for critical business logic
- Integration tests for API endpoints
- E2E tests for core user flows (Playwright)
- Load testing with realistic workloads
- Security audit (OWASP top 10)
- *Duration: 5 days*

**M10.3: Production Deployment** *(Depends on: M10.2)*
- Production Cloudflare account setup
- Domain configuration and SSL
- Environment variable management
- Database migration in production
- Monitoring and alerting setup
- *Duration: 2 days*

**M10.4: Beta Launch** *(Depends on: M10.3)*
- Invite early testers
- Collect feedback and bug reports
- Hot fixes for critical issues
- Analytics review and optimization
- *Duration: 5 days*

---

## Success Metrics

**Performance:**
- API response time: p50 < 50ms, p99 < 200ms globally
- Real-time latency: < 100ms for WebSocket message delivery
- Search response time: < 300ms for semantic search

**AI Effectiveness:**
- Issue classification accuracy: > 85%
- Duplicate detection precision: > 90%
- Search relevance (user satisfaction): > 80%

**User Engagement:**
- Daily active users per workspace
- Issues created/resolved per week
- Real-time collaboration sessions
- Search queries per user

**Cost Efficiency:**
- Target: < $0.10 per active user per month
- Serverless scaling to zero during low usage
- AI costs within budget via caching and batching

---

## Future Enhancements (Post-Launch)

**Phase 2:**
- Two-way GitHub sync (create issues from GitHub)
- Linear import/export
- Custom fields and issue types
- Advanced automation (triggers/actions)
- Time tracking

**Phase 3:**
- Mobile apps (React Native)
- Offline mode with sync
- Multi-language support
- Advanced AI features (sprint planning, risk prediction)
- Integrations marketplace

---

## Technical Risks & Mitigations

**Risk 1: D1 Write Throughput**
- *Mitigation:* Batch writes where possible, use DOs for high-frequency updates, implement write coalescing

**Risk 2: Vectorize Cold Start**
- *Mitigation:* Pre-warm index with common queries, implement fallback to keyword search

**Risk 3: Real-time Scaling**
- *Mitigation:* Shard DOs by workspace, implement connection limits, graceful degradation

**Risk 4: AI Costs**
- *Mitigation:* Cache AI results, batch processing, user limits on AI features

---

## Appendix

### Technology Stack Summary

**Frontend:**
- Tanstack
- React 19
- TypeScript
- Tailwind CSS
- Shadcn

**Backend:**
- Cloudflare Workers
- Hono (routing)
- Drizzle ORM
- TypeScript

**Infrastructure:**
- D1 (database)
- Durable Objects (real-time)
- R2 (storage)
- KV (caching)
- Queues (async tasks)
- Vectorize (semantic search)
- Workers AI (intelligence)
- Analytics Engine (metrics)

**Development:**
- Bun (package manager, runtime)
- Wrangler (deployment)
- Drizzle Kit (migrations)

---

This PRD provides a comprehensive roadmap for building LinearFlow, a Linear clone fully leveraging Cloudflare's edge infrastructure. Each milestone builds incrementally with clear dependencies, allowing for agile iteration and early user feedback.
