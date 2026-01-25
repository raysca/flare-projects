# Tech Design: Project Wiki

## Architecture Overview

The wiki feature consists of four main subsystems:

1. **Data Layer** - Database schema for pages, hierarchy, and versions
2. **Collaboration Layer** - Yjs CRDT for real-time sync via WebSocket
3. **API Layer** - REST endpoints for CRUD, search, and version management
4. **Presentation Layer** - React components for sidebar, editor, and history

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    WikiPageEditor Component                          │    │
│  │  ┌─────────────────────┐    ┌─────────────────────────────────┐    │    │
│  │  │   WikiSidebar       │    │   CollaborativeEditor            │    │    │
│  │  │   (page tree)       │    │   (TipTap + Yjs)                 │    │    │
│  │  │                     │    │   - y-prosemirror bindings       │    │    │
│  │  │   useWikiPages()    │    │   - Awareness (cursors)          │    │    │
│  │  └─────────────────────┘    └─────────────────────────────────┘    │    │
│  └──────────────────────────────────────┬──────────────────────────────┘    │
└─────────────────────────────────────────┼───────────────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
                    ▼                                           ▼
┌───────────────────────────────────┐     ┌───────────────────────────────────┐
│        REST API (Hono)            │     │     Yjs WebSocket Server          │
│  /api/v1/wiki/*                   │     │     /ws/wiki/:pageId              │
│                                   │     │                                   │
│  - GET /pages (list/tree)         │     │  - Syncs Yjs document updates     │
│  - POST /pages (create)           │     │  - Broadcasts awareness           │
│  - PUT /pages/:id (metadata)      │     │  - Persists to DB on changes      │
│  - DELETE /pages/:id              │     │  - Auth via JWT token             │
│  - GET /pages/:id/versions        │     │                                   │
│  - POST /pages/:id/restore        │     │                                   │
└───────────────────┬───────────────┘     └───────────────────┬───────────────┘
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────┐
                    │               D1 Database (SQLite)          │
                    │                                             │
                    │  wiki_pages (metadata, hierarchy)           │
                    │  wiki_page_versions (history snapshots)     │
                    │  wiki_page_content (Yjs document state)     │
                    └─────────────────────────────────────────────┘
```

## Data Model

### New Database Tables

```typescript
// packages/database/src/schema/wiki.ts

// Wiki pages - metadata and hierarchy
export const wikiPages = sqliteTable("wiki_pages", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references((): any => wikiPages.id, {
    onDelete: "cascade", // Delete children when parent deleted
  }),
  title: text("title").notNull(),
  slug: text("slug").notNull(), // URL-friendly identifier
  icon: text("icon"), // Emoji or icon identifier
  sortOrder: integer("sort_order").notNull().default(0),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lastEditedById: text("last_edited_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Wiki page content - stores Yjs document state
export const wikiPageContent = sqliteTable("wiki_page_content", {
  id: text("id").primaryKey(),
  pageId: text("page_id")
    .notNull()
    .unique()
    .references(() => wikiPages.id, { onDelete: "cascade" }),
  // Yjs document state (binary, base64 encoded)
  yjsState: text("yjs_state").notNull(),
  // Plain text extraction for search
  plainText: text("plain_text"),
  // HTML rendering for read-only display
  htmlContent: text("html_content"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Wiki page versions - history snapshots
export const wikiPageVersions = sqliteTable("wiki_page_versions", {
  id: text("id").primaryKey(),
  pageId: text("page_id")
    .notNull()
    .references(() => wikiPages.id, { onDelete: "cascade" }),
  // Version number (auto-increment per page)
  versionNumber: integer("version_number").notNull(),
  // Yjs document state at this version
  yjsState: text("yjs_state").notNull(),
  // HTML snapshot for diff display
  htmlContent: text("html_content"),
  // Who created this version
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Optional commit message
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Indexes
// CREATE INDEX idx_wiki_pages_project ON wiki_pages(project_id, parent_id);
// CREATE INDEX idx_wiki_pages_slug ON wiki_pages(project_id, slug);
// CREATE INDEX idx_wiki_versions_page ON wiki_page_versions(page_id, version_number DESC);
// CREATE INDEX idx_wiki_content_search ON wiki_page_content(plain_text); -- For FTS
```

### Data Flow for Collaborative Editing

```
1. User opens wiki page
   └─► Client connects to /ws/wiki/:pageId
   └─► Server loads Yjs state from wiki_page_content
   └─► Server sends initial state to client
   └─► Client initializes TipTap with Yjs doc

2. User types in editor
   └─► Yjs generates update (binary diff)
   └─► Update sent to WebSocket server
   └─► Server broadcasts to other clients
   └─► Server debounces and persists to wiki_page_content

3. Another user joins
   └─► Server sends current Yjs state
   └─► Server sends awareness (other users' cursors)
   └─► New client syncs and sees live content

4. Version created (manual save or auto-snapshot)
   └─► Current Yjs state copied to wiki_page_versions
   └─► HTML rendered and stored for diff display
```

## Proposed API Endpoints

### Wiki Pages CRUD

```typescript
// GET /api/v1/projects/:projectId/wiki/pages
// Returns page tree for sidebar
interface WikiPageTreeItem {
  id: string;
  title: string;
  slug: string;
  icon?: string;
  parentId: string | null;
  children: WikiPageTreeItem[];
  updatedAt: string;
  lastEditedBy?: { id: string; name: string; avatarUrl?: string };
}
type Response = WikiPageTreeItem[];

// POST /api/v1/projects/:projectId/wiki/pages
// Create new page
interface CreatePageRequest {
  title: string;
  parentId?: string;
  icon?: string;
  content?: string; // Initial HTML content (converted to Yjs)
}
type Response = WikiPage;

// GET /api/v1/projects/:projectId/wiki/pages/:pageId
// Get page metadata + content
interface WikiPageDetail {
  id: string;
  title: string;
  slug: string;
  icon?: string;
  parentId: string | null;
  breadcrumbs: { id: string; title: string; slug: string }[];
  htmlContent: string; // For read-only rendering
  createdBy: { id: string; name: string };
  lastEditedBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// PUT /api/v1/projects/:projectId/wiki/pages/:pageId
// Update page metadata (not content - content synced via WebSocket)
interface UpdatePageRequest {
  title?: string;
  parentId?: string | null;
  icon?: string;
  sortOrder?: number;
}

// DELETE /api/v1/projects/:projectId/wiki/pages/:pageId
// Delete page and all children
```

### Version History

```typescript
// GET /api/v1/projects/:projectId/wiki/pages/:pageId/versions
// List all versions
interface WikiVersionListItem {
  id: string;
  versionNumber: number;
  authorId: string;
  author: { id: string; name: string; avatarUrl?: string };
  message?: string;
  createdAt: string;
}
type Response = WikiVersionListItem[];

// GET /api/v1/projects/:projectId/wiki/pages/:pageId/versions/:versionId
// Get specific version content
interface WikiVersionDetail extends WikiVersionListItem {
  htmlContent: string;
}

// GET /api/v1/projects/:projectId/wiki/pages/:pageId/versions/:versionId/diff
// Get diff between version and current (or another version)
// Query param: ?compareWith=<versionId|current>
interface WikiVersionDiff {
  before: string; // HTML
  after: string;  // HTML
  diff: string;   // Unified diff or HTML diff
}

// POST /api/v1/projects/:projectId/wiki/pages/:pageId/versions/:versionId/restore
// Restore page to a previous version
interface RestoreVersionRequest {
  message?: string; // Optional commit message
}
type Response = WikiPage;

// POST /api/v1/projects/:projectId/wiki/pages/:pageId/versions
// Manually create a version (save point)
interface CreateVersionRequest {
  message?: string;
}
type Response = WikiVersionListItem;
```

### Search

```typescript
// GET /api/v1/projects/:projectId/wiki/search
// Full-text search across wiki content
// Query param: ?q=<search term>&limit=20
interface WikiSearchResult {
  pageId: string;
  title: string;
  slug: string;
  snippet: string; // Text snippet with highlighted matches
  breadcrumbs: { id: string; title: string }[];
  score: number;
}
type Response = WikiSearchResult[];
```

## Real-Time Collaboration with Yjs

### WebSocket Protocol Extension

Add new WebSocket route for wiki collaboration:

```typescript
// apps/server/src/realtime/upgrade.ts
// Add pattern: /ws/wiki/:pageId

const wikiMatch = url.pathname.match(/^\/ws\/wiki\/([^/]+)$/);
if (wikiMatch) {
  const pageId = wikiMatch[1];
  // Verify user has access to the page's project
  // Initialize Yjs sync handler
}
```

### Yjs WebSocket Handler

```typescript
// apps/server/src/realtime/wiki-handler.ts

import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// In-memory cache of active Yjs documents
const documents = new Map<string, Y.Doc>();
const awareness = new Map<string, Map<string, AwarenessState>>();

interface AwarenessState {
  clientId: number;
  user: { id: string; name: string; avatarUrl?: string; color: string };
  cursor?: { anchor: number; head: number };
}

export const wikiWebSocketHandler = {
  open(ws: ServerWebSocket<WikiWebSocketData>) {
    const { pageId, userId, userName, avatarUrl } = ws.data;

    // Get or create Yjs document
    let doc = documents.get(pageId);
    if (!doc) {
      doc = new Y.Doc();
      // Load from database
      const content = await loadPageContent(pageId);
      if (content?.yjsState) {
        Y.applyUpdate(doc, Buffer.from(content.yjsState, 'base64'));
      }
      documents.set(pageId, doc);
    }

    // Subscribe to document channel
    ws.subscribe(`wiki:${pageId}`);

    // Send sync step 1 (full document state)
    const stateVector = Y.encodeStateVector(doc);
    ws.send(encodeSyncStep1(stateVector));

    // Send current awareness states
    const pageAwareness = awareness.get(pageId) || new Map();
    ws.send(encodeAwarenessUpdate([...pageAwareness.values()]));

    // Add user to awareness
    const userAwareness: AwarenessState = {
      clientId: ws.data.clientId,
      user: { id: userId, name: userName, avatarUrl, color: generateColor(userId) },
    };
    pageAwareness.set(ws.data.id, userAwareness);
    awareness.set(pageId, pageAwareness);

    // Broadcast awareness update
    ws.publish(`wiki:${pageId}`, encodeAwarenessUpdate([userAwareness]));
  },

  message(ws: ServerWebSocket<WikiWebSocketData>, message: Buffer) {
    const { pageId } = ws.data;
    const doc = documents.get(pageId);
    if (!doc) return;

    const messageType = decoding.readVarUint(decoding.createDecoder(message));

    switch (messageType) {
      case MESSAGE_SYNC:
        handleSyncMessage(ws, doc, message);
        break;
      case MESSAGE_AWARENESS:
        handleAwarenessMessage(ws, pageId, message);
        break;
    }
  },

  close(ws: ServerWebSocket<WikiWebSocketData>) {
    const { pageId, id } = ws.data;

    // Remove from awareness
    const pageAwareness = awareness.get(pageId);
    if (pageAwareness) {
      pageAwareness.delete(id);
      // Broadcast awareness removal
      ws.publish(`wiki:${pageId}`, encodeAwarenessRemove(ws.data.clientId));
    }

    // Persist document if no more connections
    if (!pageAwareness?.size) {
      const doc = documents.get(pageId);
      if (doc) {
        persistDocument(pageId, doc);
        documents.delete(pageId);
      }
      awareness.delete(pageId);
    }
  },
};

// Debounced persistence
const persistQueue = new Map<string, NodeJS.Timeout>();

function schedulePersist(pageId: string, doc: Y.Doc) {
  const existing = persistQueue.get(pageId);
  if (existing) clearTimeout(existing);

  persistQueue.set(pageId, setTimeout(() => {
    persistDocument(pageId, doc);
    persistQueue.delete(pageId);
  }, 2000)); // Persist 2 seconds after last change
}
```

### Frontend Yjs Integration

```typescript
// hooks/use-collaborative-editor.ts

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEditor } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

interface UseCollaborativeEditorOptions {
  pageId: string;
  user: { id: string; name: string; avatarUrl?: string };
  token: string;
}

export function useCollaborativeEditor({ pageId, user, token }: UseCollaborativeEditorOptions) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [collaborators, setCollaborators] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    const wsProvider = new WebsocketProvider(
      `ws://${window.location.host}/ws/wiki/${pageId}?token=${token}`,
      pageId,
      ydoc
    );

    wsProvider.on('status', ({ status }) => setStatus(status));

    wsProvider.awareness.on('change', () => {
      const users = Array.from(wsProvider.awareness.getStates().values())
        .filter(state => state.user)
        .map(state => state.user);
      setCollaborators(users);
    });

    // Set local user awareness
    wsProvider.awareness.setLocalStateField('user', {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      color: generateUserColor(user.id),
    });

    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      ydoc.destroy();
    };
  }, [pageId, token, user]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }), // Disable default history, Yjs handles it
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: user.name, color: generateUserColor(user.id) },
      }),
      // ... other extensions
    ],
  }, [ydoc, provider]);

  return { editor, status, collaborators, ydoc };
}
```

## Component Interfaces

### Frontend Component Structure

```
routes/_layout.projects/$projectId/wiki/
├── route.tsx              # Wiki layout with sidebar
├── index.tsx              # Wiki home (list or first page)
├── $pageSlug.tsx          # Individual page view/edit
└── $pageSlug.history.tsx  # Version history page

components/wiki/
├── wiki-sidebar.tsx           # Page tree navigation
├── wiki-page-tree.tsx         # Recursive tree component
├── wiki-page-tree-item.tsx    # Single tree item (draggable)
├── collaborative-editor.tsx   # TipTap + Yjs editor
├── wiki-presence.tsx          # Show who's viewing/editing
├── wiki-breadcrumbs.tsx       # Hierarchy breadcrumb nav
├── wiki-version-history.tsx   # Version list
├── wiki-version-diff.tsx      # Diff viewer
├── create-page-dialog.tsx     # New page modal
└── wiki-search.tsx            # Search dialog/popover
```

### Key Component Props

```typescript
// WikiSidebar
interface WikiSidebarProps {
  projectId: string;
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onCreatePage: (parentId?: string) => void;
}

// CollaborativeEditor
interface CollaborativeEditorProps {
  pageId: string;
  user: { id: string; name: string; avatarUrl?: string };
  token: string;
  readOnly?: boolean;
  onTitleChange?: (title: string) => void;
}

// WikiPresence
interface WikiPresenceProps {
  collaborators: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    color: string;
  }>;
}

// WikiVersionHistory
interface WikiVersionHistoryProps {
  pageId: string;
  projectId: string;
  onRestore: (versionId: string) => void;
}

// WikiVersionDiff
interface WikiVersionDiffProps {
  beforeHtml: string;
  afterHtml: string;
  beforeLabel: string;
  afterLabel: string;
}
```

### Hooks

```typescript
// hooks/use-wiki.ts

// Fetch page tree for sidebar
function useWikiPages(projectId: string): UseQueryResult<WikiPageTreeItem[]>;

// Fetch single page details
function useWikiPage(projectId: string, pageId: string): UseQueryResult<WikiPageDetail>;

// Fetch page by slug
function useWikiPageBySlug(projectId: string, slug: string): UseQueryResult<WikiPageDetail>;

// Page mutations
function useCreateWikiPage(): UseMutationResult<WikiPage, Error, CreatePageRequest>;
function useUpdateWikiPage(): UseMutationResult<WikiPage, Error, UpdatePageRequest>;
function useDeleteWikiPage(): UseMutationResult<void, Error, string>;
function useMoveWikiPage(): UseMutationResult<WikiPage, Error, MovePageRequest>;

// Version history
function useWikiVersions(pageId: string): UseQueryResult<WikiVersionListItem[]>;
function useWikiVersion(pageId: string, versionId: string): UseQueryResult<WikiVersionDetail>;
function useRestoreWikiVersion(): UseMutationResult<WikiPage, Error, RestoreRequest>;
function useCreateWikiVersion(): UseMutationResult<WikiVersionListItem, Error, CreateVersionRequest>;

// Search
function useWikiSearch(projectId: string, query: string): UseQueryResult<WikiSearchResult[]>;
```

## Performance & Security

### Performance Considerations

1. **Document caching** - Keep active Yjs documents in memory, evict after 5 min of no connections
2. **Debounced persistence** - Batch database writes (2 second debounce after last change)
3. **Lazy loading** - Only load page content when viewing, not in sidebar tree
4. **Version snapshots** - Auto-create versions every 5 minutes during active editing (configurable)
5. **Search indexing** - Extract plain text on save for SQLite FTS or simple LIKE queries
6. **Tree caching** - Cache page tree with short TTL (30 seconds), invalidate on changes

### Security & Authorization

1. **Project membership** - All wiki operations require project membership
2. **WebSocket auth** - JWT token required for wiki WebSocket connections
3. **Page-level access** - Verify user has access to page's project before any operation
4. **Version immutability** - Versions cannot be deleted (audit trail)
5. **Content sanitization** - Sanitize HTML output to prevent XSS

### Database Indexes

```sql
-- Page queries
CREATE INDEX idx_wiki_pages_project ON wiki_pages(project_id);
CREATE INDEX idx_wiki_pages_parent ON wiki_pages(parent_id);
CREATE INDEX idx_wiki_pages_project_slug ON wiki_pages(project_id, slug);

-- Version queries
CREATE INDEX idx_wiki_versions_page ON wiki_page_versions(page_id, created_at DESC);
CREATE INDEX idx_wiki_versions_author ON wiki_page_versions(author_id);

-- Full-text search (SQLite FTS5)
CREATE VIRTUAL TABLE wiki_search USING fts5(
  page_id,
  title,
  plain_text,
  content='wiki_page_content',
  content_rowid='rowid'
);
```

## Trade-offs

### Decision: Yjs vs. Operational Transformation (OT)

**Chosen: Yjs (CRDT)**

| Approach | Pros | Cons |
|----------|------|------|
| Yjs (CRDT) | No central authority needed, works offline, proven in production (Notion, etc.) | Larger document size, learning curve |
| OT | Smaller updates, well-understood | Requires server to resolve conflicts, complex |

*Rationale: Yjs is battle-tested in production collaborative editors, has excellent TipTap integration via y-prosemirror, and handles conflict resolution automatically.*

### Decision: Store Yjs state vs. HTML

**Chosen: Store both**

| Approach | Pros | Cons |
|----------|------|------|
| Yjs state only | Single source of truth, smaller storage | Must render HTML on every read |
| HTML only | Fast reads | Loses Yjs history, can't resume collaboration |
| Both | Fast reads, collaboration support | Duplication, sync complexity |

*Rationale: Store Yjs state for collaboration and HTML for fast read-only rendering and search. Regenerate HTML on save.*

### Decision: Version storage strategy

**Chosen: Full snapshots**

| Approach | Pros | Cons |
|----------|------|------|
| Full snapshots | Simple restore, independent versions | Storage grows with versions |
| Delta compression | Smaller storage | Complex restore, dependent chain |
| Yjs history | Native to Yjs | Tied to document lifecycle |

*Rationale: Full snapshots are simpler to implement and restore. Storage is cheap. Can add compression/cleanup later.*

### Decision: Real-time vs. auto-save polling

**Chosen: Real-time WebSocket**

| Approach | Pros | Cons |
|----------|------|------|
| Real-time (Yjs) | True collaboration, instant sync | WebSocket complexity |
| Auto-save polling | Simpler, works without WS | No live collaboration, conflicts |

*Rationale: User explicitly requested Google Docs-style collaboration. Yjs over WebSocket delivers this experience.*

## File Structure

```
packages/database/src/schema/
└── wiki.ts                          # NEW: Wiki schema

apps/server/src/
├── api/
│   └── wiki.ts                      # NEW: Wiki REST API routes
├── realtime/
│   ├── wiki-handler.ts              # NEW: Yjs WebSocket handler
│   ├── upgrade.ts                   # MODIFY: Add /ws/wiki/:pageId route
│   └── types.ts                     # MODIFY: Add wiki WebSocket types
├── routes/_layout.projects/$projectId/
│   ├── route.tsx                    # MODIFY: Add Wiki nav item
│   └── wiki/                        # NEW: Wiki routes
│       ├── route.tsx
│       ├── index.tsx
│       ├── $pageSlug.tsx
│       └── $pageSlug.history.tsx
├── components/
│   └── wiki/                        # NEW: Wiki components
│       ├── wiki-sidebar.tsx
│       ├── wiki-page-tree.tsx
│       ├── wiki-page-tree-item.tsx
│       ├── collaborative-editor.tsx
│       ├── wiki-presence.tsx
│       ├── wiki-breadcrumbs.tsx
│       ├── wiki-version-history.tsx
│       ├── wiki-version-diff.tsx
│       ├── create-page-dialog.tsx
│       └── wiki-search.tsx
├── hooks/
│   └── use-wiki.ts                  # NEW: Wiki hooks
└── lib/
    └── query-keys.ts                # MODIFY: Add wiki keys
```

## Dependencies

New npm packages required:

```json
{
  "yjs": "^13.6.x",
  "y-prosemirror": "^1.2.x",
  "y-websocket": "^1.5.x",
  "lib0": "^0.2.x",
  "@tiptap/extension-collaboration": "^2.x",
  "@tiptap/extension-collaboration-cursor": "^2.x",
  "diff": "^5.x"  // For version diff display
}
```
