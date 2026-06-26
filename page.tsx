@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
body { background:#f6f7fb; color:#0f172a; }
input, select, textarea { outline:none; }
.card { @apply bg-white border border-slate-200 rounded-2xl shadow-soft; }
.btn { @apply rounded-xl px-4 py-2 font-semibold transition border; }
.btn-primary { @apply bg-slate-900 text-white border-slate-900 hover:bg-slate-700; }
.btn-ghost { @apply bg-white text-slate-900 border-slate-200 hover:bg-slate-50; }
.input { @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-500; }
.label { @apply text-xs font-semibold text-slate-500; }
.th { @apply px-3 py-2 text-left text-xs font-bold text-slate-500; }
.td { @apply px-3 py-2 text-sm border-t border-slate-100; }
