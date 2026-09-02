import Link from "next/link";

type Props = {
  dark?: boolean;
};

export function TopNav({ dark = false }: Props) {
  const shell = dark
    ? "border-white/10 bg-black/35 text-white backdrop-blur-xl"
    : "border-slate-200 bg-white text-slate-900";

  return (
    <header className="fixed left-0 right-0 top-0 z-40 px-4 pt-4 sm:px-8">
      <nav
        className={`mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border px-4 py-3 shadow-lg ${shell}`}
      >
        <div className="w-24 text-sm text-transparent">.</div>
        <Link href="/" className="text-xl font-semibold tracking-tight sm:text-2xl">
          PrintAnywhere
        </Link>
        <div className="flex w-24 items-center justify-end gap-3 text-sm">
          <Link href="/" className="opacity-90 transition hover:opacity-100">
            Home
          </Link>
          <Link href="/dashboard" className="opacity-90 transition hover:opacity-100">
            Dashboard
          </Link>
        </div>
      </nav>
    </header>
  );
}
