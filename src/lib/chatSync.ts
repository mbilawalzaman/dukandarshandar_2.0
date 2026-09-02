const SELECTED_CONVERSATION_KEY = "chat-selected-conversation";
const WIDGET_OPEN_KEY = "chat-widget-open";

export function getSyncedSelectedConversation(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_CONVERSATION_KEY);
}

export function setSyncedSelectedConversation(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(SELECTED_CONVERSATION_KEY, id);
  else localStorage.removeItem(SELECTED_CONVERSATION_KEY);
  window.dispatchEvent(new Event("chatSelectionChange"));
}

/** Clear conversation selection + close floating widget (call on logout). */
export function clearChatSessionState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SELECTED_CONVERSATION_KEY);
  localStorage.setItem(WIDGET_OPEN_KEY, "false");
  window.dispatchEvent(new Event("chatSelectionChange"));
  window.dispatchEvent(new Event("chatWidgetChange"));
}

export function subscribeSelectedConversation(onChange: (id: string | null) => void) {
  if (typeof window === "undefined") return () => undefined;

  const onStorage = (e: StorageEvent) => {
    if (e.key === SELECTED_CONVERSATION_KEY) onChange(e.newValue);
  };
  const onCustom = () => onChange(getSyncedSelectedConversation());

  window.addEventListener("storage", onStorage);
  window.addEventListener("chatSelectionChange", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("chatSelectionChange", onCustom);
  };
}

export function getSyncedWidgetOpen(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(WIDGET_OPEN_KEY) === "true";
}

export function setSyncedWidgetOpen(open: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WIDGET_OPEN_KEY, open ? "true" : "false");
  window.dispatchEvent(new Event("chatWidgetChange"));
}

export function subscribeWidgetOpen(onChange: (open: boolean) => void) {
  if (typeof window === "undefined") return () => undefined;

  const onStorage = (e: StorageEvent) => {
    if (e.key === WIDGET_OPEN_KEY) onChange(e.newValue === "true");
  };
  const onCustom = () => onChange(getSyncedWidgetOpen());

  window.addEventListener("storage", onStorage);
  window.addEventListener("chatWidgetChange", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("chatWidgetChange", onCustom);
  };
}

export function openChatInNewWindow(conversationId: string, isAdmin: boolean) {
  if (typeof window === "undefined") return;
  const base = isAdmin ? "/admin/messages" : "/messages";
  window.open(`${base}?c=${encodeURIComponent(conversationId)}`, "_blank", "noopener,noreferrer");
}
