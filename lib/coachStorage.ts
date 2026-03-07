export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function loadCoachMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem("navox-coach-messages");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCoachMessages(messages: ChatMessage[]) {
  localStorage.setItem("navox-coach-messages", JSON.stringify(messages));
}

export function clearCoachMessages() {
  localStorage.removeItem("navox-coach-messages");
  localStorage.removeItem("navox-coach-seen");
}
