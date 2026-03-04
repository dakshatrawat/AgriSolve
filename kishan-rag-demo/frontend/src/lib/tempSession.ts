let tempSessionId = "";

export function getOrCreateTempSessionId(): string {
  if (!tempSessionId) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      tempSessionId = crypto.randomUUID();
    } else {
      tempSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
  return tempSessionId;
}
