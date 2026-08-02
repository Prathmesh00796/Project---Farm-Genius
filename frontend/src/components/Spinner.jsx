/** Full-screen / inline loading sparkle */
export function Spinner({ inline }) {
  const wrap =
    inline
      ? "flex items-center gap-3 text-emerald-800"
      : "fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-white/85 backdrop-blur-sm";
  return (
    <div className={wrap}>
      <div className={`${inline ? "h-6 w-6 border-[3px]" : "h-12 w-12 border-4"} animate-spin rounded-full border-emerald-200 border-t-emerald-600 shadow-md`} />
      {!inline && <p className="text-sm font-medium text-emerald-900">Loading…</p>}
    </div>
  );
}
