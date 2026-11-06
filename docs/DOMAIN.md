# NacurenaOS domain

The language and rules of the window manager. Code in `src/os/domain` uses these words exactly,
and each invariant below has a test with the same ID.

## Ubiquitous language

| Term | Meaning |
|---|---|
| **App** | Something the visitor can open, such as Projects or Terminal. Described by an `AppDefinition`: its `AppId`, whether it is single-instance, and its default size |
| **AppId** | The name that identifies an app. It is not interchangeable with a WindowId |
| **Single-instance app** | An app that can have only one window. Opening it again brings back the window it already has |
| **Window** | One open instance of an app on the desktop. An entity: it stays the same window while its position and state change, and two windows are never equal just because they look alike |
| **WindowId** | The identity of a window. It comes from an injected generator, never from the domain itself |
| **Window state** | `normal`, `minimised` or `maximised` |
| **Normal** | The window is shown at its own bounds and can be moved and resized |
| **Minimised** | The window is hidden and reachable from the taskbar. It remembers whether it was normal or maximised |
| **Maximised** | The window fills the viewport. Its own bounds are kept, unused, for when it is restored |
| **Compact viewport** | A viewport narrower than 768 px. Every window is displayed over the whole viewport and cannot be moved or resized. Its state and bounds do not change, so it returns to them when the viewport grows |
| **Visible** | Not minimised |
| **Focus** | The one window that receives keyboard input. There may be none |
| **Z-order** | A whole number per window that says what is in front: a higher value covers a lower one. Values need not be consecutive |
| **Topmost** | The visible window with the highest z-order. Minimised windows do not count |
| **Position** | The top-left corner of a window, in whole CSS pixels, measured from the top-left of the viewport. It can be negative |
| **Size** | A width and a height in whole CSS pixels, both above zero |
| **Bounds** | A position plus a size. A window's bounds are always its *normal* bounds, whatever its state |
| **Display bounds** | Where a window is actually drawn: the whole viewport if maximised or if the viewport is compact, otherwise its bounds. Derived, never stored |
| **Viewport** | The desktop work area that windows live in, not counting the taskbar |
| **Title bar** | The strip at the top of a window, 32 px high, used to drag it |
| **Window controls** | The three cells at the right of the title bar: minimise, maximise, close. 40 px each, 120 px in total. They never start a drag |
| **Grab strip** | The part of the title bar that must stay reachable: 64 px wide, the full title bar height, and outside the window controls, so it can always start a drag |
| **Cascade** | Where new windows open: starting at 128, 16, just right of the desktop icon column, then 32 px further down and right for each open window, returning to the start after 8 |
| **Left limit** | A window's right edge never goes left of 184 px, the window controls plus a grab strip. So `minX = 184 - width` |
| **Minimum size** | The smallest a window can be: 320 × 200 px |
| **Address** | Where the visitor is: a language, plus the App of the focused window, or no app when nothing has focus. Derived from focus, never stored. It names an App, never a Window |
| **Locale root** | The Address with no app: `/en/`, `/nl/`, `/es/`. The bare `/` is the same desktop in English |
| **Show an app** | Bring an app forward without adding to it: focus its topmost window, restoring one if all are minimised, and open a window only if it has none |
| **Show the desktop** | Minimise every visible window, so that nothing has focus. No window is lost |

## Invariants

A **state** invariant is true of any single state, so it can be checked by looking at a snapshot
(`checkInvariants`). A **transition** invariant compares the state before and after a command, so
it can only be tested by running that command.

| ID | Kind | Rule |
|---|---|---|
| INV-01 | State | At most one window is focused, and the focus points to an existing window |
| INV-02 | State | The focused window is the topmost visible window |
| INV-03 | State | A minimised window is never focused |
| INV-04 | State | If any window is visible, exactly one is focused |
| INV-05 | State | Z-order values are unique non-negative integers |
| INV-06 | State | Window ids are unique |
| INV-07 | State | Every window keeps a grab strip inside the viewport, beside its window controls, including the stored bounds of minimised and maximised windows |
| INV-08 | State | Every window is at least the minimum size |
| INV-09 | State | A single-instance app has at most one window |
| INV-10 | Transition | Opening a new window focuses it |
| INV-11 | Transition | Opening an open single-instance app creates nothing and focuses its window, restoring it first if minimised |
| INV-12 | Transition | Closing the focused window focuses the next topmost visible window, or nothing if none is left |
| INV-13 | Transition | Minimising the focused window focuses the next topmost visible window, or nothing if none is left |
| INV-14 | Transition | A maximised window's display bounds equal the viewport, also after a viewport change |
| INV-15 | Transition | Maximise then restore returns the exact previous bounds, also with a minimise in between |
| INV-16 | Transition | Restoring a minimised window returns it to its previous state and focuses it |
| INV-17 | Transition | A viewport change keeps every window reachable |
| INV-18 | Transition | A command never changes the previous manager, and a command that changes nothing returns the same instance and no events |
| INV-19 | Transition | Resizing from an edge or corner never moves an edge the gesture does not hold |
| INV-20 | Transition | In a compact viewport every window's display bounds equal the viewport, and moving or resizing is refused |
| INV-21 | Transition | A new window that fits the viewport opens fully inside it |
| INV-22 | Transition | Showing an app creates a window only if the app has none. Otherwise it focuses that app's topmost visible window, or restores its highest minimised one |
| INV-23 | Transition | Showing the desktop leaves no visible window and no focus, and keeps every window. Repeating it is a no-op |

INV-04 is stricter than "at most one focused window". If "click the desktop to unfocus" is added
later, relax it on purpose and record why.

## What happens when a command cannot apply as asked

| Outcome | When | Example |
|---|---|---|
| **Clamp** | A normal gesture went too far | Dragging past the edge: the window stops at the limit |
| **No-op** | The command is already true | Minimising a minimised window: same instance, no events |
| **Error** | The UI asked for something it should never ask | Unknown window id, moving a maximised window, moving a window in a compact viewport, focusing a minimised window |

## Event storming (lite)

Commands are what someone asks for, and events are facts that became true. `WindowFocused` only
appears when focus actually moved to another window.

| Command | Domain events | Invariants checked |
|---|---|---|
| OpenApp (new window) | WindowOpened, WindowFocused | INV-01 to 09, INV-10, INV-21 |
| OpenApp (single-instance, already open) | WindowRestored if minimised, WindowFocused if focus moved | INV-09, INV-11 |
| ShowApp (no window yet) | WindowOpened, WindowFocused | INV-10, INV-22 |
| ShowApp (has a window) | WindowRestored if minimised, WindowFocused if focus moved | INV-22 |
| ShowDesktop | WindowMinimised for each visible window | INV-03, INV-04, INV-23 |
| FocusWindow | WindowFocused | INV-01 to 05 |
| MoveWindow | WindowMoved | INV-07, INV-20 |
| ResizeWindow | WindowResized | INV-07, INV-08, INV-20 |
| ResizeWindowFromEdge | WindowResized | INV-07, INV-08, INV-19, INV-20 |
| MinimiseWindow | WindowMinimised, WindowFocused if another window takes focus | INV-03, INV-04, INV-13 |
| MaximiseWindow | WindowMaximised, WindowFocused if focus moved | INV-02, INV-14 |
| RestoreWindow | WindowRestored, WindowFocused if focus moved | INV-15, INV-16 |
| CloseWindow | WindowClosed, WindowFocused if another window takes focus | INV-12 |
| ResizeViewport | ViewportResized | INV-07, INV-14, INV-17, INV-20 |

Every command returns its events as plain data and dispatches nothing, so the domain stays pure.
Later layers decide what events are for, such as terminal history or sounds.

## The Address and history

The domain does not know about URLs. The rules live in `src/os/routing`, and they are stated here
because they are written in the language above. **The Address is derived from Focus**, the same way
Display bounds are derived from a window's state, so the URL and the desktop cannot drift apart.

| What happened | Address | History |
|---|---|---|
| A deliberate open: an icon or a start menu item | The app opened | **Push** |
| Focus moved: a click, Tab, the taskbar, a restore | The newly focused app | Replace |
| A close or minimise, and focus moved to another window | That window's app | Replace |
| The last visible window closed or was minimised | The locale root | Replace |
| The Address did not change, such as a second Documents window | Unchanged | Nothing |

History holds one entry per deliberate open. Pushing on focus would turn Back into a list of clicks.
Close replaces, so no entry points at an app the visitor closed.

| The browser arrives at | The desktop does |
|---|---|
| Page load on an app's URL | Restores the saved layout, then **ShowApp**. The URL wins |
| Page load on a locale root | Restores the saved layout, and the Address catches up by replacing. A root names no app, so it overrules nothing |
| Back or Forward to an app's URL | **ShowApp** |
| Back or Forward to a locale root | **ShowDesktop** |

Back to a locale root cannot leave a window focused: INV-04 forbids a visible window without focus,
and a focused window would rewrite the URL and trap Back on the page. So it minimises, and Forward
brings the same window back. Back and Forward never close a window.

A **multi-instance app** shares one URL. `/en/documents/` means "the topmost Documents window, or a
new one if there are none". A WindowId is random and exists for one visitor, so it can never go in a
link.
