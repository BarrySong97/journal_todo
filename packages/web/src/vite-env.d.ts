/// <reference types="vite/client" />

// View Transitions API types
interface ViewTransition {
  finished: Promise<void>
  ready: Promise<void>
  updateCallbackDone: Promise<void>
}

interface Document {
  startViewTransition?(callback: () => void | Promise<void>): ViewTransition
}
