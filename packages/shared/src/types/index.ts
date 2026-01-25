/**
 * Common types shared across web and desktop
 */

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntry {
  id: string;
  date: Date;
  content: string;
  todos: Todo[];
}
