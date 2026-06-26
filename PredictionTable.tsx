@tailwind base;
@tailwind components;
@tailwind utilities;

body { background: #f6f7fb; color: #111827; }
.card { @apply rounded-2xl bg-white shadow-sm border border-gray-200; }
.btn { @apply rounded-xl px-4 py-3 font-bold transition border; }
.btn-primary { @apply bg-blue-700 text-white border-blue-700 hover:bg-blue-800; }
.btn-light { @apply bg-white text-gray-900 border-gray-200 hover:bg-gray-50; }
.input { @apply w-full rounded-xl border border-gray-300 px-3 py-2 text-sm; }
.th { @apply bg-gray-100 text-xs font-bold text-gray-600 p-2 text-left; }
.td { @apply border-t border-gray-100 p-2 text-sm; }
