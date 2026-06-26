@tailwind base;
@tailwind components;
@tailwind utilities;
:root { color-scheme: light; }
body { background:#f6f7fb; color:#111827; }
input, select, textarea { background:white; }
.card { @apply rounded-2xl bg-white shadow-sm border border-slate-200; }
.btn { @apply rounded-xl px-4 py-2 font-semibold transition active:scale-[.98]; }
.btn-primary { @apply bg-blue-700 text-white hover:bg-blue-800; }
.btn-sub { @apply bg-slate-100 text-slate-900 hover:bg-slate-200; }
.th { @apply px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wide; }
.td { @apply px-3 py-2 text-sm border-t border-slate-100; }
.field { @apply w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500; }
