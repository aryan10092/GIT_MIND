export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export const SUGGESTED_QUESTIONS = [
  "What is this project about?",
  "How is the project structured?",
  "Whate are the api endpoints",
  "How do I run this project?",
];
