import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="surface-panel flex min-h-72 items-center justify-center p-8">
      <div className="flex items-center gap-3 text-sm font-bold text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin text-rival-green" />
        {label}
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="surface-panel border-rival-rose/30 bg-rival-rose/10 p-5 text-sm font-semibold text-rival-rose">
      {message}
    </div>
  );
}
