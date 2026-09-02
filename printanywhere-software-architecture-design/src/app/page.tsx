import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute right-[-40px] top-36 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-24 right-1/4 h-44 w-44 rounded-full bg-orange-400/20 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 pb-14 pt-10 text-center">
        <h1 className="text-[clamp(3.3rem,11vw,7.4rem)] font-bold leading-[0.95] tracking-tight">PrintAnywhere</h1>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-200">
            Local
          </span>
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-200">
            Secure
          </span>
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-200">
            Privacy First
          </span>
        </div>

        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">Popular file formats available.</p>

        <div className="mt-10">
          <Link
            href="/dashboard"
            className="inline-flex rounded-xl bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
          >
            Get Started
          </Link>
        </div>
      </section>
    </main>
  );
}
