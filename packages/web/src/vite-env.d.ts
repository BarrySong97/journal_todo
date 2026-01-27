/// <reference types="vite/client" />
/// <reference path="./types/zustand-immer.d.ts" />

// View Transitions API types
interface ViewTransition {
  finished: Promise<void>
  ready: Promise<void>
  updateCallbackDone: Promise<void>
}

interface Document {
  startViewTransition?(callback: () => void | Promise<void>): ViewTransition
}
