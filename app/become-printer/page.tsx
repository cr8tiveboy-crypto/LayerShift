import Image from "next/image";

export default function BecomePrinterPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0d0d]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-10 md:py-12">
          <a href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="LayerShift"
              width={220}
              height={60}
              priority
              className="h-12 w-auto object-contain"
            />
          </a>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="/" className="text-sm text-white/80 hover:text-white">
              Home
            </a>
            <a href="/#how-it-works" className="text-sm text-white/80 hover:text-white">
              How it works
            </a>
            <a
              href="/"
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-black transition hover:opacity-90"
            >
              Back to Home
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,115,0,0.18),transparent_35%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-4xl">
            <div className="mb-5 inline-block rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300">
              Join the LayerShift network
            </div>

            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              Turn your printer into a <span className="text-orange-500">local business.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
              LayerShift helps local makers get discovered by customers nearby.
              Apply to become a printer and start receiving jobs in your area.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://forms.gle/hHbkKARWYsFz6Vm97"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-orange-500 px-6 py-4 font-bold text-black transition hover:opacity-90"
              >
                Apply Now
              </a>

              <a
                href="/"
                className="rounded-2xl border border-white/20 px-6 py-4 font-bold text-white transition hover:bg-white/5"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-3 text-sm font-bold text-orange-400">01</div>
              <h2 className="text-xl font-semibold">Create your profile</h2>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Tell us about your printer, materials, turnaround time, and service area.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-3 text-sm font-bold text-orange-400">02</div>
              <h2 className="text-xl font-semibold">Get approved</h2>
              <p className="mt-3 text-sm leading-7 text-white/65">
                We review applications to keep the network reliable and customer-friendly.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-3 text-sm font-bold text-orange-400">03</div>
              <h2 className="text-xl font-semibold">Receive local jobs</h2>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Once approved, customers in your area can send requests directly to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0d0d0d]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-3">
          <div>
            <Image
              src="/logo.svg"
              alt="LayerShift"
              width={160}
              height={40}
              className="mb-4 h-auto w-auto"
            />
            <p className="max-w-xs text-sm text-white/60">
              LayerShift connects local customers and nearby 3D printers.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Platform</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <a href="/" className="hover:text-white">
                  Home
                </a>
              </li>
              <li>
                <a href="/#find-printer" className="hover:text-white">
                  Find printers
                </a>
              </li>
              <li>
                <a href="https://forms.gle/hHbkKARWYsFz6Vm97" target="_blank" rel="noreferrer" className="hover:text-white">
                  Printer application
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Apply</h4>
            <p className="mb-4 text-sm text-white/60">
              Ready to join the network and start taking local requests?
            </p>
            <a
              href="https://forms.gle/hHbkKARWYsFz6Vm97"
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-black transition hover:opacity-90"
            >
              Become a Printer
            </a>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-6 py-6 text-sm text-white/50 md:flex-row">
            <div>© 2026 LayerShift</div>
            <div>Local 3D printing marketplace. Availability may vary by region.</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
