import { Suspense } from "react";
import NewUIChatClient from "./chat-client";

export default function NewUIChatPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">Loading chat...</div>}>
      <NewUIChatClient />
    </Suspense>
  );
}
