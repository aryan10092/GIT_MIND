export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export const SUGGESTED_QUESTIONS = [
  "What is this project about?",
  "How is the project structured?",
  "What are the api endpoints used",

  "How do I run this project?",
];
