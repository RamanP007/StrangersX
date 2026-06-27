import { User, Send } from './icons'

// Decorative, non-interactive preview of the app inside a browser frame.
export function BrowserMockup() {
  return (
    <div className="card overflow-hidden shadow-xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <div className="mx-auto flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          strangerx.app/video
        </div>
      </div>

      {/* App body */}
      <div className="space-y-3 p-3">
        {/* App header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
              SX
            </span>
            <span className="text-sm font-semibold">StrangerX</span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-xs">
            <span className="rounded-full px-2.5 py-0.5 text-muted-foreground">Text</span>
            <span className="rounded-full bg-primary px-2.5 py-0.5 font-medium text-primary-foreground">Video</span>
          </div>
        </div>

        {/* Stage */}
        <div className="grid grid-cols-5 gap-2">
          {/* Video column */}
          <div className="col-span-3 space-y-2">
            <div className="relative flex aspect-[4/3] items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/40 to-indigo-700/30">
              <User size={26} className="text-white/70" />
              <span className="absolute bottom-2 left-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                Stranger
              </span>
            </div>
            <div className="relative flex aspect-[5/2] items-center justify-center rounded-lg bg-gradient-to-br from-primary/40 to-fuchsia-600/30">
              <User size={20} className="text-white/70" />
              <span className="absolute bottom-1.5 left-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                You
              </span>
            </div>
          </div>

          {/* Chat column */}
          <div className="col-span-2 flex flex-col rounded-lg border border-border bg-muted/40 p-2">
            <div className="flex items-center gap-1.5 rounded-md bg-card p-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[8px] font-bold text-primary-foreground">SX</span>
              <div>
                <div className="h-1.5 w-12 rounded bg-foreground/40" />
                <div className="mt-1 h-1.5 w-16 rounded bg-foreground/15" />
              </div>
            </div>
            <div className="mt-auto flex items-center gap-1.5">
              <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">Start</span>
              <div className="h-5 flex-1 rounded-md border border-border bg-background" />
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Send size={11} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
