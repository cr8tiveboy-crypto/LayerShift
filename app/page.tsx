"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type Printer = {
  id: number;
  name: string | null;
  email: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  bio: string | null;
  materials: string[] | null;
  printer_type: string | null;
  color_options: string[] | null;
  jobs_completed: number | null;
  active: boolean | null;
};

type ToastState = {
  show: boolean;
  message: string;
  actionLabel?: string;
  actionTarget?: "upload" | null;
};

export default function HomePage() {
  const [postalCode, setPostalCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [filteredPrinters, setFilteredPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);

  const [fileName, setFileName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [estimateWeight, setEstimateWeight] = useState<number | null>(null);
  const [estimateTime, setEstimateTime] = useState<number | null>(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    actionLabel: "",
    actionTarget: null,
  });

  const findPrinterRef = useRef<HTMLElement | null>(null);
  const printersRef = useRef<HTMLElement | null>(null);
  const fileUploadRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const postalInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchPrinters();
  }, []);

  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast({
        show: false,
        message: "",
        actionLabel: "",
        actionTarget: null,
      });
    }, 5200);
    return () => clearTimeout(timer);
  }, [toast.show, toast.message]);

  function showToast(
    message: string,
    options?: { actionLabel?: string; actionTarget?: "upload" | null }
  ) {
    setToast({
      show: true,
      message,
      actionLabel: options?.actionLabel || "",
      actionTarget: options?.actionTarget || null,
    });
  }

  async function fetchPrinters() {
    const { data, error } = await supabase
      .from("printers")
      .select("*")
      .order("jobs_completed", { ascending: false });

    if (error) {
      console.error("Error loading printers:", error);
      setPrinters([]);
      showToast(error.message || "Could not load printers.");
      return;
    }

    const normalized = ((data || []) as Printer[]).filter((printer) => {
      if (printer.active === false) return false;
      return true;
    });

    setPrinters(normalized);
  }

  function normalizePostalCode(value: string) {
    return value.replace(/\s+/g, "").toUpperCase().trim();
  }

  function scrollToElement(ref: React.RefObject<HTMLElement | null>) {
    if (!ref.current) return;

    const headerOffset = 118;
    const elementTop = ref.current.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top: elementTop - headerOffset,
      behavior: "smooth",
    });
  }

  async function handleSearch() {
    const cleanPostal = normalizePostalCode(postalCode);

    if (!cleanPostal) {
      setFilteredPrinters([]);
      setSelectedPrinter(null);
      showToast("Enter a postal code first.");
      postalInputRef.current?.focus();
      return;
    }

    setHasSearched(true);
    setSearching(true);
    setSelectedPrinter(null);

    if (printers.length === 0) {
      setFilteredPrinters([]);
      setSearching(false);
      showToast("No printers are loaded right now.");
      return;
    }

    const firstThree = cleanPostal.slice(0, 3);

    const matches = printers.filter((printer) => {
      const printerPostal = normalizePostalCode(printer.postal_code || "");
      if (!printerPostal) return false;
      return printerPostal === cleanPostal || printerPostal.startsWith(firstThree);
    });

    if (matches.length === 0) {
      setFilteredPrinters([]);
      showToast("No printers found near you.");
      setSearching(false);
      return;
    }

    setFilteredPrinters(matches);
    setSearching(false);

    setTimeout(() => {
      scrollToElement(printersRef);
    }, 100);
  }

  function handleFileChange(file: File | null) {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "stl" && extension !== "3mf") {
      showToast("Please upload an STL or 3MF file.");
      return;
    }

    setUploadedFile(file);
    setFileName(file.name);

    const sizeMb = file.size / (1024 * 1024);
    const fakeWeight = Math.max(8, Math.round(sizeMb * 22));
    const fakeTime = Math.max(1, Math.round(sizeMb * 3.5));

    setEstimateWeight(fakeWeight);
    setEstimateTime(fakeTime);

    showToast("File uploaded. You can now choose a printer.");
  }

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleSelectPrinter(printer: Printer) {
    if (!uploadedFile) {
      showToast("Upload a file first, then choose a printer.", {
        actionLabel: "Back to upload ↑",
        actionTarget: "upload",
      });
      return;
    }

    setSelectedPrinter(printer);

    setTimeout(() => {
      setShowRequestModal(true);
    }, 180);
  }

  async function handleSendRequest() {
    if (!selectedPrinter || !uploadedFile) {
      showToast("Missing printer or file.");
      return;
    }

    if (!selectedPrinter.email) {
      showToast("This printer does not have an email set up yet.");
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      showToast("Enter your name and email.");
      return;
    }

    try {
      setRequesting(true);

      const payload = {
        printer_id: selectedPrinter.id,
        printer_email: selectedPrinter.email || null,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        file_name: fileName,
        notes: requestNotes.trim() || null,
        status: "pending",
      };

      const { data, error } = await supabase
        .from("requests")
        .insert(payload)
        .select();

      if (error) {
        console.error("Error creating request:", error);
        showToast(error.message || "Could not send request.");
        return;
      }

      console.log("Request created:", data);

      try {
        const emailRes = await fetch("/api/notify/new-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            printerEmail: selectedPrinter.email,
            printerName: selectedPrinter.name,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            fileName,
            notes: requestNotes.trim() || "",
          }),
        });

        const emailJson = await emailRes.json().catch(() => null);

        if (!emailRes.ok) {
          console.error("Email API failed:", emailJson);
          showToast(emailJson?.error || "Request saved, but email failed.");
        } else {
          console.log("Email API success:", emailJson);
        }
      } catch (emailErr) {
        console.error("Email request crashed:", emailErr);
        showToast("Request saved, but email request crashed.");
      }

      setShowRequestModal(false);
      setCustomerName("");
      setCustomerEmail("");
      setRequestNotes("");
      setSelectedPrinter(null);

      showToast("Request sent successfully.");
    } catch (err: any) {
      console.error("Unexpected request error:", err);
      showToast(err?.message || "Something went wrong.");
    } finally {
      setRequesting(false);
    }
  }

  const visiblePrinters = useMemo(() => {
    if (!hasSearched) return [];
    return filteredPrinters;
  }, [hasSearched, filteredPrinters]);

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
            <a href="#how-it-works" className="text-sm text-white/80 hover:text-white">
              How it works
            </a>
            <a href="#find-printer" className="text-sm text-white/80 hover:text-white">
              Find Printer
            </a>
            <a
              href="/become-printer"
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-black transition hover:opacity-90"
            >
              Become a Printer
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,115,0,0.18),transparent_35%)]" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-5xl">
            <div className="mb-5 inline-block rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 animate-[fadeIn_0.8s_ease-out]">
              Fast local 3D printing is coming together.
            </div>

            <p className="mb-4 text-lg font-semibold text-white animate-[fadeInUp_0.8s_ease-out]">
              Upload your file. Get matched with a nearby printer. Pick up local.
            </p>

            <h1 className="text-4xl font-black leading-tight md:hidden">
              Get It Printed <span className="text-orange-500">Near You.</span>
            </h1>

            <h1 className="hidden whitespace-nowrap text-6xl font-black leading-none md:block lg:text-7xl">
              Get It Printed <span className="text-orange-500">Near You.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
              LayerShift connects customers with local 3D printers for fast,
              simple, neighborhood-based printing.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => scrollToElement(fileUploadRef)}
                className="rounded-2xl bg-orange-500 px-6 py-4 font-bold text-black transition hover:opacity-90"
              >
                Upload File
              </button>

              <button
                type="button"
                onClick={() => scrollToElement(findPrinterRef)}
                className="rounded-2xl border border-white/20 px-6 py-4 font-bold text-white transition hover:bg-white/5"
              >
                Find Printer
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-black scroll-mt-40 md:scroll-mt-44">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="text-3xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="min-h-[140px] rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-sm font-bold text-orange-400">01</div>
              <h3 className="text-lg font-semibold">Upload your file</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                Add your STL or 3MF file and get a quick estimate.
              </p>
            </div>

            <div className="min-h-[140px] rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-sm font-bold text-orange-400">02</div>
              <h3 className="text-lg font-semibold">Choose a local printer</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                Browse nearby printers based on your postal code.
              </p>
            </div>

            <div className="min-h-[140px] rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-sm font-bold text-orange-400">03</div>
              <h3 className="text-lg font-semibold">Send your request</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                Submit your print request and coordinate the next step.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section ref={fileUploadRef} className="bg-black scroll-mt-40 md:scroll-mt-44">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-3xl font-bold">Upload your print file</h2>
              <p className="mt-3 text-white/70">Supported file types: STL and 3MF</p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".stl,.3mf"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />

              <button
                type="button"
                onClick={handleChooseFile}
                className="upload-dropzone mt-6 block w-full rounded-3xl border border-dashed border-white/20 p-10 text-center transition hover:bg-white/5"
              >
                <div className="text-lg font-semibold">
                  {fileName ? fileName : "Click to upload your file"}
                </div>
                <div className="mt-2 text-sm text-white/50">
                  STL and 3MF files supported
                </div>
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-xl font-semibold">Quick estimate</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-black/40 p-3">
                  <div className="text-sm text-white/50">Estimated weight</div>
                  <div className="mt-1 text-xl font-bold">
                    {estimateWeight ? `${estimateWeight}g` : "--"}
                  </div>
                </div>

                <div className="rounded-2xl bg-black/40 p-3">
                  <div className="text-sm text-white/50">Estimated print time</div>
                  <div className="mt-1 text-xl font-bold">
                    {estimateTime ? `${estimateTime}h` : "--"}
                  </div>
                </div>

                <p className="text-xs text-white/45">
                  Final pricing and timing may vary by printer and material.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="find-printer" ref={findPrinterRef} className="bg-black scroll-mt-40 md:scroll-mt-44">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold">Find a local printer</h2>
            <p className="mt-3 text-white/70">
              Enter your postal code to see nearby printers.
            </p>

            <div className="mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
              <input
                ref={postalInputRef}
                type="text"
                placeholder="e.g. H2X 1Y4"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="h-14 flex-1 rounded-2xl border border-white/15 bg-white/5 px-5 text-white outline-none placeholder:text-white/35 focus:border-orange-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="h-14 rounded-2xl bg-orange-500 px-6 font-bold text-black transition hover:opacity-90 disabled:opacity-70"
              >
                {searching ? "Searching..." : "Find Printers"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="local-printers"
        ref={printersRef}
        className="bg-black scroll-mt-40 md:scroll-mt-32"
      >
        <div className="mx-auto max-w-7xl px-6 py-12">
          {hasSearched && visiblePrinters.length > 0 && (
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">Local Printers Near You</h2>
                <p className="mt-2 text-white/70">
                  Find nearby makers ready to print your file.
                </p>
              </div>
            </div>
          )}

          {!hasSearched ? (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-sm font-semibold text-orange-400 transition hover:text-orange-300"
              >
                ↑ Back to top
              </button>
            </div>
          ) : visiblePrinters.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visiblePrinters.map((printer) => {
                const isSelected = selectedPrinter?.id === printer.id;

                return (
                  <div
                    key={printer.id}
                    className={`rounded-3xl border p-6 transition ${
                      isSelected
                        ? "scale-[1.02] border-orange-500 bg-orange-500/10"
                        : "border-white/10 bg-white/[0.04] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold">
                          {printer.name || "Local Printer"}
                        </h3>
                        <p className="mt-1 text-sm text-white/55">
                          {[printer.city, printer.province].filter(Boolean).join(", ")}
                        </p>
                      </div>

                      <div className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-orange-300">
                        {printer.jobs_completed || 0} jobs
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/70">
                      {printer.bio || "Reliable local printing service."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(printer.materials || []).slice(0, 4).map((material, idx) => (
                        <span
                          key={idx}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                        >
                          {material}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleSelectPrinter(printer)}
                      className="mt-6 w-full rounded-2xl bg-orange-500 px-4 py-3 font-bold text-black transition hover:opacity-90"
                    >
                      Select Printer
                    </button>
                  </div>
                );
              })}
            </div>
          ) : hasSearched ? (
            <div className="mt-10 text-center text-white/60">
              No printers matched this search.
            </div>
          ) : null}
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
              LayerShift connects you with local 3D printers for fast, simple,
              and reliable production.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Platform</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <a href="#how-it-works" className="hover:text-white">
                  How it works
                </a>
              </li>
              <li>
                <a href="#find-printer" className="hover:text-white">
                  Find printers
                </a>
              </li>
              <li>
                <a href="/become-printer" className="hover:text-white">
                  Become a printer
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Get started</h4>
            <p className="mb-4 text-sm text-white/60">
              Join the network or get your first print started.
            </p>
            <a
              href="/become-printer"
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

      {showRequestModal && selectedPrinter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-6 shadow-2xl animate-[modalIn_0.18s_ease-out]">
            <h3 className="text-2xl font-bold">Send Request</h3>
            <p className="mt-2 text-sm text-white/60">
              Requesting from {selectedPrinter.name || "selected printer"}
            </p>

            <div className="mt-6 space-y-4">
              <input
                type="text"
                placeholder="Your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none placeholder:text-white/35 focus:border-orange-500"
              />

              <input
                type="email"
                placeholder="Your email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-4 outline-none placeholder:text-white/35 focus:border-orange-500"
              />

              <textarea
                placeholder="Project notes"
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none placeholder:text-white/35 focus:border-orange-500"
              />

              <div className="rounded-2xl bg-black/40 p-4 text-sm text-white/65">
                <div>File: {fileName || "No file selected"}</div>
                <div className="mt-1">
                  Estimate: {estimateWeight ? `${estimateWeight}g` : "--"} /{" "}
                  {estimateTime ? `${estimateTime}h` : "--"}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white/80 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                disabled={requesting}
                className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 font-bold text-black transition hover:opacity-90 disabled:opacity-70"
              >
                {requesting ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed right-6 top-36 z-[60] w-[calc(100%-3rem)] max-w-md rounded-2xl border border-orange-500/40 bg-black/70 px-5 py-4 text-white shadow-xl backdrop-blur animate-[slideIn_0.2s_ease-out] md:top-40">
          <div className="font-semibold text-white/90">{toast.message}</div>

          {toast.actionTarget === "upload" && (
            <button
              type="button"
              onClick={() => {
                scrollToElement(fileUploadRef);
                setToast({
                  show: false,
                  message: "",
                  actionLabel: "",
                  actionTarget: null,
                });
              }}
              className="mt-3 text-sm font-bold text-orange-300 underline underline-offset-4 transition hover:text-orange-200"
            >
              {toast.actionLabel || "Back to upload ↑"}
            </button>
          )}
        </div>
      )}

      <style jsx global>{`
        .upload-dropzone,
        .upload-dropzone * {
          cursor: pointer !important;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px) translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0);
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
