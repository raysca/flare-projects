# Implementation Tasks: Project Wiki

## [ ] Phase 1: Database & Foundation

### [ ] Task 1.1: Create wiki database schema
**File:** `packages/database/src/schema/wiki.ts` (new)

Create tables:
- `wiki_pages` - id, projectId, parentId, title, slug, icon, sortOrder, createdById, lastEditedById, timestamps
- `wiki_page_content` - id, pageId (unique), yjsState, plainText, htmlContent, updatedAt
- `wiki_page_versions` - id, pageId, versionNumber, yjsState, htmlContent, authorId, message, createdAt

Export types: `WikiPage`, `WikiPageContent`, `WikiPageVersion`

**Acceptance:** Schema compiles, types exported.

---

### [ ] Task 1.2: Export wiki schema from database package
**File:** `packages/database/src/schema/index.ts`

- Add `export * from "./wiki";`

**Acceptance:** Wiki types importable from `@linearflow/database`.

---

### [ ] Task 1.3: Add database indexes for wiki queries
**File:** `packages/database/src/schema/wiki.ts` or migration

Add indexes:
- `(project_id)` on wiki_pages
- `(parent_id)` on wiki_pages
- `(project_id, slug)` on wiki_pages (unique)
- `(page_id, created_at DESC)` on wiki_page_versions

**Acceptance:** Indexes created, query performance verified.

---

### [ ] Task 1.4: Add wiki query keys
**File:** `apps/server/src/lib/query-keys.ts`

Add `wikiKeys` object:
- `all: ['wiki']`
- `pages: (projectId) => [...all, 'pages', projectId]`
- `page: (projectId, pageId) => [...all, 'page', projectId, pageId]`
- `pageBySlug: (projectId, slug) => [...all, 'page', projectId, 'slug', slug]`
- `versions: (pageId) => [...all, 'versions', pageId]`
- `version: (pageId, versionId) => [...all, 'version', pageId, versionId]`
- `search: (projectId, query) => [...all, 'search', projectId, query]`

**Acceptance:** Query keys exported and TypeScript compiles.

---

## [ ] Phase 2: Backend API

### [ ] Task 2.1: Create wiki pages list endpoint
**File:** `apps/server/src/api/wiki.ts` (new)

Implement `GET /projects/:projectId/wiki/pages`:
- Verify user is project member
- Fetch all pages for project with parent relationships
- Build tree structure in response
- Include lastEditedBy user info
- Order by sortOrder within each level

**Acceptance:** Returns nested page tree for sidebar.

---

### [ ] Task 2.2: Create wiki page CRUD endpoints
**File:** `apps/server/src/api/wiki.ts`

Implement:
- `POST /projects/:projectId/wiki/pages` - Create page with title, optional parentId, icon
  - Generate slug from title
  - Create empty Yjs document in wiki_page_content
  - Set createdById to current user
- `GET /projects/:projectId/wiki/pages/:pageId` - Get page metadata + HTML content
  - Include breadcrumbs (ancestor chain)
- `PUT /projects/:projectId/wiki/pages/:pageId` - Update metadata (title, parentId, icon, sortOrder)
  - Regenerate slug if title changes
- `DELETE /projects/:projectId/wiki/pages/:pageId` - Delete page and children (cascade)

**Acceptance:** All CRUD operations work, proper authorization.

---

### [ ] Task 2.3: Create wiki page by slug endpoint
**File:** `apps/server/src/api/wiki.ts`

Implement `GET /projects/:projectId/wiki/pages/by-slug/:slug`:
- Look up page by project + slug
- Return same response as GET by ID
- Used for URL-based navigation

**Acceptance:** Can fetch page by slug for routing.

---

### [ ] Task 2.4: Create version history endpoints
**File:** `apps/server/src/api/wiki.ts`

Implement:
- `GET /projects/:projectId/wiki/pages/:pageId/versions` - List all versions
  - Order by versionNumber DESC
  - Include author info
- `GET /projects/:projectId/wiki/pages/:pageId/versions/:versionId` - Get version detail
  - Include htmlContent for display
- `POST /projects/:projectId/wiki/pages/:pageId/versions` - Create manual save point
  - Copy current yjsState to new version
  - Increment versionNumber
  - Optional message field
- `POST /projects/:projectId/wiki/pages/:pageId/versions/:versionId/restore` - Restore to version
  - Copy version's yjsState to wiki_page_content
  - Create new version marking the restore
  - Update lastEditedById

**Acceptance:** Version CRUD works, restore creates proper audit trail.

---

### [ ] Task 2.5: Create version diff endpoint
**File:** `apps/server/src/api/wiki.ts`

Implement `GET /projects/:projectId/wiki/pages/:pageId/versions/:versionId/diff`:
- Query param `?compareWith=<versionId|current>`
- Return before HTML, after HTML
- Optionally compute unified diff

**Acceptance:** Returns HTML for both versions for diff display.

---

### [ ] Task 2.6: Create wiki search endpoint
**File:** `apps/server/src/api/wiki.ts`

Implement `GET /projects/:projectId/wiki/search`:
- Query param `?q=<term>&limit=20`
- Search title and plainText fields
- Use SQLite LIKE or FTS if available
- Return page info with text snippet containing match
- Include breadcrumbs for context

**Acceptance:** Search returns relevant pages with snippets.

---

### [ ] Task 2.7: Mount wiki routes
**File:** `apps/server/src/api.ts`

- Import and mount `wikiRoutes` at `/projects/:projectId/wiki`

**Acceptance:** All wiki endpoints accessible at `/api/v1/projects/:projectId/wiki/*`.

---

## [ ] Phase 3: Yjs WebSocket Infrastructure

### [ ] Task 3.1: Add wiki WebSocket types
**File:** `apps/server/src/realtime/types.ts`

Add:
- `WikiWebSocketData` interface extending base with pageId, clientId
- Update `ChannelType` to include `'wiki'`
- Add Yjs message type constants

**Acceptance:** Types compile, ready for handler implementation.

---

### [ ] Task 3.2: Extend WebSocket upgrade handler for wiki
**File:** `apps/server/src/realtime/upgrade.ts`

Add pattern `/ws/wiki/:pageId`:
- Extract pageId from URL
- Verify JWT token
- Verify user has access to page's project
- Create `WikiWebSocketData` with clientId
- Upgrade connection

**Acceptance:** Wiki WebSocket connections authenticated and upgraded.

---

### [ ] Task 3.3: Create Yjs document manager
**File:** `apps/server/src/realtime/wiki-documents.ts` (new)

Implement document lifecycle:
- `getDocument(pageId)` - Get or create Y.Doc from memory/DB
- `loadDocument(pageId)` - Load Yjs state from wiki_page_content
- `persistDocument(pageId, doc)` - Save Yjs state to wiki_page_content
- `destroyDocument(pageId)` - Clean up memory when no connections
- In-memory Map of active documents
- Auto-persist on debounced timer (2 seconds)
- Auto-cleanup after 5 min of no connections

**Acceptance:** Documents load from DB, persist on changes, clean up properly.

---

### [ ] Task 3.4: Create Yjs sync message handlers
**File:** `apps/server/src/realtime/wiki-handler.ts` (new)

Implement Yjs sync protocol:
- Handle sync step 1 (state vector exchange)
- Handle sync step 2 (missing updates)
- Handle update messages (broadcast to other clients)
- Use lib0 encoding/decoding

**Acceptance:** Multiple clients sync document state correctly.

---

### [ ] Task 3.5: Create awareness handlers
**File:** `apps/server/src/realtime/wiki-handler.ts`

Implement awareness protocol:
- Track connected users per document
- Handle awareness updates (cursor position, user info)
- Broadcast awareness changes to all clients
- Remove user from awareness on disconnect
- Generate unique colors per user

**Acceptance:** Clients see each other's cursors and presence.

---

### [ ] Task 3.6: Integrate wiki WebSocket handler
**File:** `apps/server/src/index.ts`

- Add wiki-specific handlers alongside existing websocketHandlers
- Route wiki messages through wiki-handler

**Acceptance:** Wiki WebSocket fully functional end-to-end.

---

### [ ] Task 3.7: Create auto-version service
**File:** `apps/server/src/services/wiki-versioning.ts` (new)

Implement automatic version snapshots:
- Create version every 5 minutes during active editing
- Track last version time per document
- Triggered by persist events
- Label as "Auto-save" in message

**Acceptance:** Versions created automatically during editing sessions.

---

## [ ] Phase 4: Frontend - Sidebar & Navigation

### [ ] Task 4.1: Create useWikiPages hook
**File:** `apps/server/src/hooks/use-wiki.ts` (new)

- Fetch from `GET /api/v1/projects/:projectId/wiki/pages`
- Use `wikiKeys.pages(projectId)` query key
- Return typed `WikiPageTreeItem[]`
- Include loading and error states

**Acceptance:** Hook returns page tree for sidebar.

---

### [ ] Task 4.2: Create useWikiPage hook
**File:** `apps/server/src/hooks/use-wiki.ts`

- Fetch from `GET /api/v1/projects/:projectId/wiki/pages/:pageId`
- Use `wikiKeys.page(projectId, pageId)` query key
- Also create `useWikiPageBySlug` variant

**Acceptance:** Hooks return page detail with breadcrumbs.

---

### [ ] Task 4.3: Create wiki page mutation hooks
**File:** `apps/server/src/hooks/use-wiki.ts`

Create mutations:
- `useCreateWikiPage` - POST, invalidate pages list
- `useUpdateWikiPage` - PUT, invalidate page and list
- `useDeleteWikiPage` - DELETE, invalidate list, navigate away if current
- `useMoveWikiPage` - PUT with parentId/sortOrder changes

**Acceptance:** All mutations work with proper cache invalidation.

---

### [ ] Task 4.4: Create WikiPageTreeItem component
**File:** `apps/server/src/components/wiki/wiki-page-tree-item.tsx` (new)

- Display page icon, title
- Expand/collapse for children
- Active state styling when selected
- Context menu (rename, delete, add child)
- Drag handle for reordering (visual only for now)

**Acceptance:** Tree item renders with expand/collapse and context menu.

---

### [ ] Task 4.5: Create WikiPageTree component
**File:** `apps/server/src/components/wiki/wiki-page-tree.tsx` (new)

- Recursive rendering of WikiPageTreeItem
- Handle expand/collapse state
- Pass selection callbacks up

**Acceptance:** Full tree renders with proper nesting.

---

### [ ] Task 4.6: Create WikiSidebar component
**File:** `apps/server/src/components/wiki/wiki-sidebar.tsx` (new)

- Header with "Wiki" title and "New Page" button
- Search input (navigates to search on enter)
- WikiPageTree component
- Loading skeleton state
- Empty state when no pages

**Acceptance:** Sidebar fully functional with create and navigation.

---

### [ ] Task 4.7: Add Wiki tab to project navigation
**File:** `apps/server/src/routes/_layout.projects/$projectId/route.tsx`

- Add "Wiki" nav item with Book icon
- Route to `/projects/:projectId/wiki`

**Acceptance:** Wiki tab visible in project navigation.

---

### [ ] Task 4.8: Create wiki layout route
**File:** `apps/server/src/routes/_layout.projects/$projectId/wiki/route.tsx` (new)

- Layout with WikiSidebar on left
- Outlet for page content on right
- Responsive: sidebar collapsible on mobile

**Acceptance:** Wiki layout renders with sidebar and content area.

---

### [ ] Task 4.9: Create wiki index route
**File:** `apps/server/src/routes/_layout.projects/$projectId/wiki/index.tsx` (new)

- If pages exist, redirect to first page
- If no pages, show welcome state with "Create first page" button

**Acceptance:** Wiki index handles empty and non-empty states.

---

## [ ] Phase 5: Frontend - Collaborative Editor

### [ ] Task 5.1: Install Yjs dependencies
**File:** `apps/server/package.json`

Add dependencies:
- `yjs`
- `y-prosemirror`
- `y-websocket`
- `lib0`
- `@tiptap/extension-collaboration`
- `@tiptap/extension-collaboration-cursor`

**Acceptance:** Dependencies installed, no version conflicts.

---

### [ ] Task 5.2: Create useCollaborativeEditor hook
**File:** `apps/server/src/hooks/use-collaborative-editor.ts` (new)

Implement:
- Create Y.Doc instance
- Create WebsocketProvider with auth token
- Track connection status (connecting, connected, disconnected)
- Track collaborators from awareness
- Set local user awareness (name, color)
- Clean up on unmount

**Acceptance:** Hook manages Yjs connection lifecycle correctly.

---

### [ ] Task 5.3: Create CollaborativeEditor component
**File:** `apps/server/src/components/wiki/collaborative-editor.tsx` (new)

- Use useCollaborativeEditor hook
- TipTap editor with Collaboration and CollaborationCursor extensions
- Disable default history (Yjs handles undo/redo)
- Formatting toolbar (reuse from RichTextEditor)
- @mentions support (reuse existing)
- Connection status indicator
- Auto-reconnect handling

**Acceptance:** Editor syncs content between multiple browser windows.

---

### [ ] Task 5.4: Create WikiPresence component
**File:** `apps/server/src/components/wiki/wiki-presence.tsx` (new)

- Display avatar stack of connected users
- Tooltip showing names
- Colored rings matching cursor colors
- "X users viewing" summary

**Acceptance:** Shows who else is on the page in real-time.

---

### [ ] Task 5.5: Create WikiBreadcrumbs component
**File:** `apps/server/src/components/wiki/wiki-breadcrumbs.tsx` (new)

- Render ancestor chain from page detail
- Each item links to that page
- Current page shown without link
- Separator icons between items

**Acceptance:** Breadcrumbs display and navigate correctly.

---

### [ ] Task 5.6: Create wiki page view/edit route
**File:** `apps/server/src/routes/_layout.projects/$projectId/wiki/$pageSlug.tsx` (new)

- Fetch page by slug using useWikiPageBySlug
- Display WikiBreadcrumbs
- Display WikiPresence
- Display CollaborativeEditor
- Editable title field
- "History" button linking to history route
- Handle page not found

**Acceptance:** Full page editing experience with collaboration.

---

## [ ] Phase 6: Frontend - Version History

### [ ] Task 6.1: Create version history hooks
**File:** `apps/server/src/hooks/use-wiki.ts`

Add hooks:
- `useWikiVersions(pageId)` - List versions
- `useWikiVersion(pageId, versionId)` - Get version detail
- `useRestoreWikiVersion()` - Restore mutation
- `useCreateWikiVersion()` - Manual save point mutation

**Acceptance:** All version hooks work correctly.

---

### [ ] Task 6.2: Create WikiVersionHistory component
**File:** `apps/server/src/components/wiki/wiki-version-history.tsx` (new)

- List of versions with author avatar, name, timestamp
- Show commit message if present
- "Current" badge on latest
- "Auto-save" badge on automatic versions
- Click to view version
- "Restore" button per version

**Acceptance:** Version list displays with all metadata.

---

### [ ] Task 6.3: Create WikiVersionDiff component
**File:** `apps/server/src/components/wiki/wiki-version-diff.tsx` (new)

- Side-by-side or inline diff view
- Use `diff` library for computation
- Highlight additions (green) and deletions (red)
- Toggle between side-by-side and inline

**Acceptance:** Diff clearly shows changes between versions.

---

### [ ] Task 6.4: Create wiki history route
**File:** `apps/server/src/routes/_layout.projects/$projectId/wiki/$pageSlug.history.tsx` (new)

- Sidebar with WikiVersionHistory
- Main area with WikiVersionDiff
- Select two versions to compare
- "Back to editing" link
- Restore confirmation dialog

**Acceptance:** Full history view with diff and restore.

---

## [ ] Phase 7: Polish & Additional Features

### [ ] Task 7.1: Create CreatePageDialog component
**File:** `apps/server/src/components/wiki/create-page-dialog.tsx` (new)

- Modal dialog for creating new page
- Title input field
- Parent page selector (dropdown of existing pages)
- Icon picker (optional)
- Template selector (optional, stretch goal)
- Create button

**Acceptance:** Dialog creates pages with proper validation.

---

### [ ] Task 7.2: Create WikiSearch component
**File:** `apps/server/src/components/wiki/wiki-search.tsx` (new)

- Search input with debounced query
- Results dropdown/popover
- Show page title, snippet, breadcrumbs
- Click to navigate to page
- Keyboard navigation support

**Acceptance:** Search finds pages and navigates on selection.

---

### [ ] Task 7.3: Add wiki search hook
**File:** `apps/server/src/hooks/use-wiki.ts`

- `useWikiSearch(projectId, query)` - Search with debounce
- Enable only when query length > 2
- Use `wikiKeys.search(projectId, query)` key

**Acceptance:** Search hook returns results with proper debouncing.

---

### [ ] Task 7.4: Implement drag-and-drop reordering
**File:** `apps/server/src/components/wiki/wiki-page-tree.tsx`

- Use dnd-kit or similar for drag-and-drop
- Allow reordering within same parent
- Allow moving to different parent (drop on folder)
- Call useMoveWikiPage on drop
- Visual feedback during drag

**Acceptance:** Pages can be reordered via drag-and-drop.

---

### [ ] Task 7.5: Add internal page links support
**File:** `apps/server/src/components/wiki/collaborative-editor.tsx`

- TipTap extension for `[[Page Name]]` syntax
- Autocomplete popup when typing `[[`
- Render as styled link
- Navigate on click
- Handle broken links (page deleted)

**Acceptance:** Internal links work with autocomplete and navigation.

---

### [ ] Task 7.6: Write unit tests for wiki API
**File:** `apps/server/src/api/wiki.test.ts` (new)

Test cases:
- Page CRUD with authorization
- Tree structure maintained correctly
- Slug generation and uniqueness
- Version creation and restore
- Search returns correct results

**Acceptance:** Tests pass with `bun test`.

---

### [ ] Task 7.7: Write E2E tests for wiki
**File:** `apps/e2e/tests/wiki.spec.ts` (new)

Test flows:
- Create page, edit content, verify save
- Navigate page hierarchy
- Multiple users see each other's cursors (if possible to test)
- Version history and restore
- Search functionality

**Acceptance:** E2E tests pass with Playwright.

---

### [ ] Task 7.8: Add empty states and loading skeletons
**Files:** All wiki components

- Loading skeletons for sidebar, editor, history
- Empty states with helpful CTAs
- Error states with retry

**Acceptance:** All loading/empty/error states polished.

---

## Task Dependency Graph

```
Phase 1 (Foundation):
1.1 ─► 1.2 ─► 1.3
1.4 (parallel)

Phase 2 (API) - requires Phase 1:
2.1 ─► 2.2 ─► 2.3
2.4 ─► 2.5
2.6
All ─► 2.7

Phase 3 (WebSocket) - requires Phase 1:
3.1 ─► 3.2 ─► 3.3 ─► 3.4 ─► 3.5 ─► 3.6
3.7 (after 3.3)

Phase 4 (Sidebar) - requires Phase 2:
4.1 ─► 4.2 ─► 4.3
4.4 ─► 4.5 ─► 4.6
4.7 ─► 4.8 ─► 4.9

Phase 5 (Editor) - requires Phase 3, Phase 4:
5.1 ─► 5.2 ─► 5.3 ─► 5.4 ─► 5.5 ─► 5.6

Phase 6 (History) - requires Phase 5:
6.1 ─► 6.2 ─► 6.3 ─► 6.4

Phase 7 (Polish) - requires Phase 6:
7.1, 7.2, 7.3, 7.4, 7.5 (parallel)
7.6, 7.7, 7.8 (after above)
```

## Suggested PR Groupings

| PR | Tasks | Description |
|----|-------|-------------|
| PR 1 | 1.1, 1.2, 1.3, 1.4 | Database schema and foundation |
| PR 2 | 2.1, 2.2, 2.3, 2.7 | Wiki pages API (CRUD) |
| PR 3 | 2.4, 2.5, 2.6 | Version history and search API |
| PR 4 | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 | Yjs WebSocket infrastructure |
| PR 5 | 3.7 | Auto-versioning service |
| PR 6 | 4.1, 4.2, 4.3 | Wiki hooks |
| PR 7 | 4.4, 4.5, 4.6, 4.7, 4.8, 4.9 | Sidebar and navigation UI |
| PR 8 | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6 | Collaborative editor |
| PR 9 | 6.1, 6.2, 6.3, 6.4 | Version history UI |
| PR 10 | 7.1, 7.2, 7.3, 7.4, 7.5 | Additional features |
| PR 11 | 7.6, 7.7, 7.8 | Tests and polish |

## Notes

- **PR 4 (Yjs WebSocket)** is the most complex and may need to be split further
- **PR 8 (Collaborative editor)** should be tested extensively with multiple users
- Consider feature-flagging the wiki until all PRs are merged
- The internal page links feature (Task 7.5) can be deferred if timeline is tight
