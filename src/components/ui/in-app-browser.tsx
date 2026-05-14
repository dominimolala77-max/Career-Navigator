import { X, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

interface InAppBrowserProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function InAppBrowser({ url, title, onClose }: InAppBrowserProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm sm:p-4">
      <div className="flex h-full flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        {/* Browser Top Bar */}
        <div className="flex items-center justify-between border-b border-border bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
              <X className="size-5" />
            </button>
            <div className="flex flex-col truncate">
              <span className="truncate text-sm font-bold text-[#0F172A]">{title}</span>
              <span className="truncate text-xs text-slate-500">{url}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
              <a href={url} target="_blank" rel="noreferrer" title="Open in normal browser tab">
                <ExternalLink className="mr-2 size-4" /> Open externally
              </a>
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Browser Content */}
        <div className="relative flex-1 bg-slate-100">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="size-8 animate-spin text-[#006B5E]" />
                <p className="text-sm font-medium text-slate-600">Loading site…</p>
              </div>
            </div>
          )}
          <iframe
            src={url}
            title={title}
            className="h-full w-full border-none"
            onLoad={() => setLoading(false)}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
