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
| **Visible** | Not minimised |
| **Focus** | The one window that receives keyboard input. There may be none |
| **Z-order** | A whole number per window that says what is in front: a higher value covers a lower one. Values need not be consecutive |
| **Topmost** | The visible window with the highest z-order. Minimised windows do not count |
| **Position** | The top-left corner of a window, in whole CSS pixels, measured from the top-left of the viewport. It can be negative |
| **Size** | A width and a height in whole CSS pixels, both above zero |
| **Bounds** | A position plus a size. A window's bounds are always its *normal* bounds, whatever its state |
| **Display bounds** | Where a window is actually drawn: the whole viewport if maximised, otherwise its bounds. Derived, never stored |
| **Viewport** | The desktop work area that windows live in, not counting the taskbar |
| **Title bar** | The strip at the top of a window, 32 px high, used to drag it |
| **Grab strip** | The part of the title bar that must stay reachable: 64 px wide and the full title bar height |
| **Minimum size** | The smallest a window can be: 320 × 200 px |

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
| INV-07 | State | Every window keeps its grab strip inside the viewport, including the stored bounds of minimised and maximised windows |
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

INV-04 is stricter than "at most one focused window". If "click the desktop to unfocus" is added
later, relax it on purpose and record why.

## What happens when a command cannot apply as asked

| Outcome | When | Example |
|---|---|---|
| **Clamp** | A normal gesture went too far | Dragging past the edge: the window stops at the limit |
| **No-op** | The command is already true | Minimising a minimised window: same instance, no events |
| **Error** | The UI asked for something it should never ask | Unknown window id, moving a maximised window, focusing a minimised window |

## Event storming (lite)

Commands are what someone asks for, and events are facts that became true. `WindowFocused` only
appears when focus actually moved to another window.

| Command | Domain events | Invariants checked |
|---|---|---|
| OpenApp (new window) | WindowOpened, WindowFocused | INV-01 to 09, INV-10 |
| OpenApp (single-instance, already open) | WindowRestored if minimised, WindowFocused if focus moved | INV-09, INV-11 |
| FocusWindow | WindowFocused | INV-01 to 05 |
| MoveWindow | WindowMoved | INV-07 |
| ResizeWindow | WindowResized | INV-07, INV-08 |
| MinimiseWindow | WindowMinimised, WindowFocused if another window takes focus | INV-03, INV-04, INV-13 |
| MaximiseWindow | WindowMaximised, WindowFocused if focus moved | INV-02, INV-14 |
| RestoreWindow | WindowRestored, WindowFocused if focus moved | INV-15, INV-16 |
| CloseWindow | WindowClosed, WindowFocused if another window takes focus | INV-12 |
| ResizeViewport | ViewportResized | INV-07, INV-14, INV-17 |

Every command returns its events as plain data and dispatches nothing, so the domain stays pure.
Later layers decide what events are for, such as terminal history or sounds.
