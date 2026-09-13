# TEST CONTRACT: TabStore (`src/store/tabStore.ts`)

- **Component / Module:** `useTabStore`
- **Status:** WORKING IN PRODUCTION
- **Pillar Alignment:** Pillar 1 (Universal Presenter Purity, Canonical Data Shapes) & Pillar 7 (Resilient Error Handling)

## Expected Behavior
Manages the application's document tab collection, tracking active tab selection, dirty unsaved changes, cursor positions, and tab lifecycle operations (create, close, switch, rename, reorder).

## Inputs
- `createTab(title, content, language)`: Optional initial properties; defaults to `"Untitled.md"`, empty content, `"markdown"`.
- `closeTab(id)`: Target tab ID. If target is active, switches focus to adjacent tab.
- `updateTabContent(id, content)`: Updates text and marks tab as `isDirty: true`.
- `saveTab(id)`: Marks tab as `isDirty: false` and invokes storage persistence via `safePersist`.

## Outputs
- `tabs: Tab[]`: Array of canonical `Tab` records adhering to `contracts/data_shapes.ts`.
- `activeTabId: string`: ID of currently focused tab.

## Edge Cases
- Closing the last remaining tab automatically creates a clean new "Untitled.md" tab to prevent blank canvas.
- Updating content of non-existent tab ID is a graceful no-op without throwing.
- Persistence failure during saveTab catches error and emits notification via `useNotificationStore`.

## Mock Dependencies
- None in production. Seeds `SAMPLE_MARKDOWN_DOCS` only when `IS_PROTOTYPE_DEMO_MODE` is true.
