import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth";
import { I18nProvider } from "./i18n";
import "./styles.css";

function currentUserId() {
  try {
    const session = JSON.parse(localStorage.getItem("gym-rival-session") ?? "null") as { user?: { id?: number }; id?: number } | null;
    return Number(session?.user?.id ?? session?.id ?? 0) || undefined;
  } catch {
    return undefined;
  }
}

function reportClientEvent(eventName: string, metadata: Record<string, unknown>) {
  fetch("/api/beta-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUserId(), eventName, metadata })
  }).catch(() => undefined);
}

window.addEventListener("error", (event) => {
  reportClientEvent("client_error", {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

window.addEventListener("unhandledrejection", (event) => {
  reportClientEvent("client_error", {
    message: event.reason instanceof Error ? event.reason.message : String(event.reason)
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
