@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
body { background:#f6f7fb; color:#111827; }
.card { @apply bg-white border border-slate-200 rounded-2xl shadow-sm; }
.btn { @apply inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold transition; }
.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }
.btn-soft { @apply bg-slate-100 text-slate-800 hover:bg-slate-200; }
