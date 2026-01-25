# Requirements: Project Wiki

## Problem Statement

- **Pain point:** Project teams lack a centralized place to document knowledge, processes, decisions, and onboarding materials. Information is scattered across external tools (Google Docs, Notion, Confluence), making it hard to keep documentation in sync with the project and accessible to all team members.
- **Priority now:** As projects grow, the need for shared documentation becomes critical. Having wikis integrated directly into the project context means documentation lives alongside issues, cycles, and team members—reducing context switching and improving discoverability.

## User Stories

### Page Management
- [ ] As a **project member**, I want to create wiki pages with rich text content, so that I can document project knowledge.
- [ ] As a **project member**, I want to organize pages hierarchically (parent/child), so that I can structure documentation logically (e.g., "Engineering" → "API Documentation" → "Authentication").
- [ ] As a **project member**, I want to edit existing wiki pages, so that documentation stays current.
- [ ] As a **project member**, I want to delete wiki pages, so that I can remove outdated content.
- [ ] As a **project member**, I want to move pages within the hierarchy, so that I can reorganize documentation as the project evolves.

### Real-Time Collaboration
- [ ] As a **project member**, I want to see who else is viewing or editing a page in real-time, so that I'm aware of collaborators.
- [ ] As a **project member**, I want to edit a page simultaneously with teammates (Google Docs style), so that we can collaborate without waiting.
- [ ] As a **project member**, I want to see other users' cursors and selections in real-time, so that I know what they're working on.
- [ ] As a **project member**, I want changes to sync automatically without manual saving, so that I never lose work.

### Version History
- [ ] As a **project member**, I want to view the full history of changes to a page, so that I can understand how documentation evolved.
- [ ] As a **project member**, I want to see who made each change and when, so that I can attribute edits.
- [ ] As a **project member**, I want to view a diff between versions, so that I can see exactly what changed.
- [ ] As a **project member**, I want to restore a previous version, so that I can undo unwanted changes.

### Navigation & Discovery
- [ ] As a **project member**, I want to access the wiki from the project navigation, so that it's easy to find.
- [ ] As a **project member**, I want to see a sidebar tree of all wiki pages, so that I can navigate the hierarchy.
- [ ] As a **project member**, I want to search wiki content, so that I can find information quickly.
- [ ] As a **project member**, I want to link to other wiki pages using `[[Page Name]]` syntax, so that I can create interconnected documentation.

### Rich Content
- [ ] As a **project member**, I want to use rich text formatting (headings, bold, lists, code blocks, tables), so that documentation is readable and well-structured.
- [ ] As a **project member**, I want to @mention teammates in wiki pages, so that I can reference people and notify them.
- [ ] As a **project member**, I want to embed images in wiki pages, so that I can include diagrams and screenshots.
- [ ] As a **project member**, I want to link to issues from wiki pages, so that documentation connects to work items.

## Success Criteria (MoSCoW)

### Must Have
- **Wiki tab** in project navigation alongside Overview, Issues, Cycles, Settings
- **Page CRUD** - Create, read, update, delete wiki pages
- **Hierarchical pages** - Pages can have parent pages (tree structure, unlimited depth)
- **Rich text editor** - TipTap-based editor with formatting toolbar
- **Sidebar navigation** - Collapsible tree view of all pages
- **Real-time collaboration** - Multiple users can edit simultaneously with live cursor sync
- **Presence indicators** - Show who is viewing/editing a page
- **Auto-save** - Changes sync automatically, no manual save button
- **Version history list** - View all versions with author and timestamp
- **Version restore** - Ability to restore any previous version
- **Project membership required** - Only project members can view/edit wiki

### Should Have
- **Version diff view** - Side-by-side or inline diff between versions
- **Wiki page search** - Full-text search across all wiki content
- **@mentions** - Mention users in wiki content (reuse existing mention system)
- **Internal page links** - `[[Page Name]]` syntax for linking between wiki pages
- **Drag-and-drop reordering** - Reorder pages in sidebar via drag-and-drop
- **Page templates** - Pre-defined templates (Meeting Notes, Decision Record, API Doc)
- **Breadcrumb navigation** - Show page hierarchy path at top of page

### Could Have
- **Image uploads** - Upload and embed images directly (store in R2)
- **Issue linking** - Link to issues with `#PROJ-123` syntax, showing preview
- **Table of contents** - Auto-generated TOC from headings
- **Export to Markdown/PDF** - Export pages for offline use
- **Page comments** - Comment on wiki pages (separate from content)
- **Favorites/bookmarks** - Star frequently accessed pages
- **Recently edited** - Quick access to recently modified pages

## Out of Scope

- **Public wiki** - Wiki is project-member only, no public sharing
- **Wiki permissions/roles** - All members have equal edit access (no viewer-only role)
- **Cross-project wiki linking** - Cannot link to pages in other projects
- **Offline editing** - Requires internet connection for real-time sync
- **Import from external tools** - No Notion/Confluence import
- **Wiki analytics** - No page view counts or engagement metrics
- **AI-assisted writing** - No AI content generation or summarization

## Existing Infrastructure (Context)

| Component | Location | Relevance |
|-----------|----------|-----------|
| `projects` table | `packages/database/src/schema/projects.ts` | Wiki pages belong to projects |
| `projectMembers` table | `packages/database/src/schema/projects.ts` | Authorization - only members access wiki |
| RichTextEditor | `apps/server/src/components/editor/rich-text-editor.tsx` | TipTap editor with @mentions |
| Project layout | `apps/server/src/routes/_layout.projects/$projectId/route.tsx` | Add Wiki nav item |
| WebSocket infrastructure | `apps/server/src/realtime/` | Foundation for real-time collaboration |

## Real-Time Collaboration Approach

For full real-time collaborative editing, we'll use **Yjs** (CRDT library) with the following architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client A (Browser)                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TipTap Editor + Yjs Extension (y-prosemirror)              │   │
│  │  - Local Yjs document                                        │   │
│  │  - Awareness (cursor position, user info)                    │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ WebSocket (y-websocket protocol)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Yjs WebSocket Server                           │
│  - Syncs Yjs documents between clients                              │
│  - Broadcasts awareness updates (cursors)                           │
│  - Persists document state to database                              │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Client B (Browser)                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TipTap Editor + Yjs Extension (y-prosemirror)              │   │
│  │  - Synced Yjs document                                       │   │
│  │  - Sees Client A's cursor in real-time                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Libraries:**
- `yjs` - CRDT implementation for conflict-free collaborative editing
- `y-prosemirror` - Yjs bindings for ProseMirror/TipTap
- `y-websocket` - WebSocket provider for Yjs sync
- Existing Bun WebSocket infrastructure extended for Yjs protocol

## Page Hierarchy Example

```
📁 Engineering
   ├── 📄 Getting Started
   ├── 📁 API Documentation
   │   ├── 📄 Authentication
   │   ├── 📄 REST Endpoints
   │   └── 📄 WebSocket Events
   └── 📁 Architecture
       ├── 📄 System Overview
       └── 📄 Database Schema
📁 Product
   ├── 📄 Roadmap
   └── 📄 Meeting Notes
📄 Welcome (root-level page)
```

## Version History Data Model

Each edit creates a version snapshot:

```
WikiPageVersion
├── id
├── pageId (FK to WikiPage)
├── content (full document state or Yjs update)
├── authorId (who made this version)
├── createdAt (when)
├── message (optional commit message)
└── previousVersionId (for traversal)
```
