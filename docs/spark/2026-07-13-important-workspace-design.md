# Important Workspace Design

## Summary

Add a permanent `Important` system view that collects references to tasks from every ordinary Workspace. The original task remains the single source of truth for text, completion status, and parent-child relationships. The Important view owns only membership intent, exclusions, presentation order, and collapsed state.

The feature must work in the app's normal narrow window and expand into a resizable two-pane layout when enough width is available.

## Goals

- Let users mark an existing task as important without copying or moving the source task.
- Include a marked task's live descendant subtree while preserving source hierarchy.
- Allow independent ordering in Important without changing source Workspace order.
- Allow removing tasks from Important without deleting source tasks.
- Keep Important accessible at the current 362px minimum window width.
- Keep text and completion edits synchronized in both directions.

## Non-goals

- Creating standalone tasks directly in Important.
- Displaying source Workspace names, dates, breadcrumbs, or source-jump actions.
- Changing parent-child relationships from Important.
- Dragging tasks across panes as an add mechanism in the first version.
- Adding filters, search, an archive, or a separate completed section.
- Making Important renamable, deletable, or reorderable among ordinary Workspaces.

## Layout and responsive behavior

### Narrow mode

- At widths below 725px, render one pane.
- Add `Important` as a permanent first entry in the Workspace switcher.
- Selecting it replaces the ordinary dated Workspace content with the Important task list.
- In Important, replace date navigation with the static title `Important`.
- When a wide window is narrowed, keep the current ordinary Workspace visible by default. Important remains available from the switcher.
- If the user was viewing Important in narrow mode and widens the window, restore the last ordinary Workspace on the left and show Important on the right.

### Wide mode

- At 725px or wider, render the current ordinary Workspace on the left and Important on the right.
- Both panes start at a 1:1 ratio and have a hard minimum content width of 362px.
- A visible center separator has a larger invisible hit target for pointer resizing without consuming additional layout width.
- Persist the user's pane ratio locally. Clamp a restored ratio whenever the current window cannot satisfy both minimum widths.
- Double-clicking the separator resets the ratio to 1:1.
- The separator is keyboard accessible: arrow keys adjust the split in small increments, Shift+Arrow uses larger increments, and Home resets to 1:1.
- Preserve the existing footer controls. In wide mode, the Workspace selector and command affordance stay associated with the left pane; settings and theme controls remain at the far right.

## Marking tasks important

- Add a star control to every source task row.
- Keep the control hidden during normal display and reveal it on row hover or keyboard focus.
- Use three states when the control is visible:
  - Outline: not currently included, or explicitly excluded from an important ancestor.
  - Solid: explicitly marked by the user.
  - Muted: included through an explicitly marked ancestor.
- Clicking an outline or muted star creates an explicit pin for that task. Clicking a solid star removes only that explicit pin.
- If a task loses its explicit pin but remains covered by an important ancestor, it stays visible and changes from solid to muted.
- If a previously excluded task is explicitly pinned, clear its exclusion and restore it to Important.

## Live subtree and deduplication rules

- Explicitly pinning a task includes that task and all of its current descendants.
- Descendants later created or moved into the source subtree appear automatically unless explicitly excluded.
- A descendant moved out of the covered source subtree disappears unless it has its own explicit pin.
- Multiple overlapping pins render each source task at most once.
- An explicitly pinned descendant covered by an explicitly pinned ancestor remains nested in the ancestor's displayed subtree.
- If the ancestor pin is removed, the independently pinned descendant becomes a top-level Important root with its own descendants.
- A pinned subtask without a pinned ancestor is normalized to depth zero in Important; descendants keep their relative depths.
- Source parent-child relationships are authoritative. Important never stores or applies an alternative hierarchy.

## Independent ordering

- Materialize Important ordering when a task first enters the view, initially matching source sibling order.
- Store order independently for every displayed task, scoped to its current source parent. Root tasks share a root-order scope.
- Dragging is vertical only and can reorder tasks among siblings with the same source parent.
- Horizontal dragging and indent/outdent commands are disabled in Important.
- Dragging a parent moves its entire visible subtree block.
- Reordering Important never updates the source task's `order`, `level`, or `parentId`.
- A newly included child is appended after the existing Important children of its source parent.
- If a task changes source parent, discard its stale order scope and append it under the new parent. Its descendants remain attached.

## Editing, completion, and collapsing

- Task text is editable from Important and updates the original task.
- The checkbox updates the original task status. Changes made in an ordinary Workspace appear immediately in Important and vice versa.
- Completed tasks remain in place with the existing completed styling until manually removed from Important.
- Task-creation keyboard behavior is disabled in Important. Editing a task must not create a sibling or child.
- Parent tasks can be collapsed independently in Important. Important collapsed state must not affect the source Workspace collapsed state.

## Removing tasks from Important

- Show a `Remove from Important` control on row hover or keyboard focus. Do not use a trash icon or destructive language.
- Removing a task guarantees that the selected task disappears from Important without modifying the source task.
- Removing a parent excludes its inherited subtree from the covering pin.
- Explicitly pinned descendants inside the removed subtree remain and are promoted to the nearest visible level, becoming roots when necessary.
- If the removed task itself has an explicit pin, clear that pin as part of removal. If an important ancestor would otherwise keep it visible, create an exclusion so it still disappears.
- Persist exclusions across reloads and across unpinning/re-pinning an ancestor. Users restore an excluded task by explicitly starring it.
- Show a non-blocking Undo toast after removal. Undo restores pin, exclusion, and ordering state from before the action.
- Do not show a confirmation dialog for this non-destructive operation.

## Persistence model

Important is a derived system view, not a row in the ordinary Workspace table.

Add durable per-task Important metadata with these logical fields:

- `todoId`: the source task identifier.
- `isPinned`: whether the user explicitly starred the task.
- `isExcluded`: whether the task is hidden despite coverage from an important ancestor.
- `sortOrder`: the task's fractional order in Important.
- `sortParentId`: the source parent identifier that scopes `sortOrder`; null denotes the Important root scope.
- Creation and update timestamps.

A metadata row may exist only to preserve order. `isPinned` and `isExcluded` must never both be true. Source task text, status, tags, source order, level, and parent remain in the existing task record and must not be duplicated.

Implement equivalent persistence behavior for SQLite and LocalStorage. Keep the resizable pane ratio and Important collapsed state as local UI preferences, following the app's existing local preference patterns.

## Derived view and data flow

1. Load ordinary Workspaces/tasks and Important metadata.
2. Find every explicitly pinned task across all Workspaces and dates.
3. Expand each pin through its current source descendants.
4. Apply exclusions, while allowing explicit descendant pins to remain visible.
5. Deduplicate overlapping subtrees.
6. Normalize each visible root to depth zero.
7. Sort roots and sibling groups with Important ordering metadata.
8. Render task rows against their source task records.

Important editing actions must address the source task directly rather than relying on the currently selected Workspace/date. The store therefore needs task lookup and update actions that can resolve a task across all loaded Workspaces.

## Source deletion and rollover

- Deleting a source task removes its Important metadata and makes its reference disappear.
- Deleting a source Workspace cleans up all Important metadata for tasks in that Workspace.
- Copy rollover creates new task identities. Copies do not inherit pins, exclusions, or Important ordering; the original remains unchanged.
- Move rollover currently creates new identities and deletes the old tasks. Before deletion, transfer the old tasks' Important metadata to the corresponding new task identities, including descendant mappings.
- If rollover omits a source task rather than moving it, treat that source task as deleted and remove its Important metadata.

## Empty and failure states

- When Important has no visible tasks, show a quiet empty state explaining that starring a task will place it here. Do not add a create button.
- If an Important metadata record points to a missing source task, omit it from rendering and clean up the stale metadata during the next persistence operation.
- Persistence failures must leave the in-memory action usable and surface the same non-blocking error treatment used by existing task operations; do not delete or mutate the source task as compensation.
- Invalid drag targets outside the current sibling group must leave the order unchanged.

## Accessibility

- Star and remove controls must be keyboard reachable when their row is focused, with explicit accessible labels.
- Hover-only visual treatment must have an equivalent focus-visible treatment.
- The resizer must expose separator semantics, current value, minimum/maximum values, and keyboard controls.
- Muted inherited state cannot rely on color alone; its accessible label must explain that the task is included through a parent.
- Removal Undo must be reachable by keyboard and announced by the existing toast system.

## Acceptance scenarios

1. Pinning a leaf adds it as an Important root; editing or completing it from either view updates both views.
2. Pinning a parent adds its current descendants. A newly created child later appears automatically at the end of its sibling group.
3. Pinning a child under a pinned parent does not duplicate it. Unpinning the parent promotes the child to a root.
4. Reordering siblings in Important persists after restart and leaves the source Workspace order unchanged.
5. Attempting to drag a task across parent groups does not change its Important order or source hierarchy.
6. Removing an inherited child hides its subtree, leaves the source untouched, and persists after restart. Undo restores it.
7. Removing a pinned parent preserves any independently pinned descendants.
8. Completing a task leaves it in place until explicitly removed.
9. Narrow mode exposes Important at the top of the switcher. Wide mode shows both panes, enforces minimum widths, persists the split, and resets it on separator double-click.
10. Copy rollover leaves Important metadata on the original only. Move rollover transfers metadata to the moved task identities.
11. Deleting a source task or Workspace removes stale Important entries without affecting unrelated pins.
12. SQLite and LocalStorage produce the same Important tree, pin, exclusion, ordering, and cleanup behavior.

