export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export const SUGGESTED_QUESTIONS = [
  "What is this project about?",
  "How is the project structured?",
  "Where is the main entry point?",
  "How do I run this project?",
];
