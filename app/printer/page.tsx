"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type RequestRow = {
  id: number;
  printer_id: number;
  customer_id: string;
  file_name: string | null;
  file_path: string | null;
  file_bucket: string | null;
  file_size: number | null;
  mime_type: string | null;
  material: string | null;
  color: string | null;
  quantity: number | null;
  notes: string | null;
  status: string | null;
  fulfillment_method?: string | null;
  fulfillment_notes?: string | null;
  delivery_fee?: number | null;
  fulfillment_response_at?: string | null;
  created_at: string | null;
  accepted_at?: string | null;
  in_progress_at?: string | null;
  completed_at?: string | null;
  declined_at?: string | null;
};

type PrinterAccount = {
  id: number;
  name: string;
};

type ViewMode = "active" | "completed" | "all";

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 30;

export default function PrinterDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [printerChecked, setPrinterChecked] = useState(false);
  const [printer, setPrinter] = useState<PrinterAccount | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [view, setView] = useState<ViewMode>("active");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const initializedRef = useRef(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const [fulfillmentDrafts, setFulfillmentDrafts] = useState<Record<number, { notes: string; fee: string }>>({});
  const [savingFulfillmentId, setSavingFulfillmentId] = useState<number | null>(null);

  const showTemporaryToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setShowToast(false);
    }, 2800);
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    const initializeSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUserId(session?.user?.id ?? null);
      setSessionChecked(true);
    };

    void initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
      setSessionChecked(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPrinterAccount = async () => {
      if (!sessionChecked) return;

      if (!userId) {
        setPrinter(null);
        setRequests([]);
        setPrinterChecked(true);
        return;
      }

      setPrinterChecked(false);

      const { data, error } = await supabase
        .from("printers")
        .select("id, name")
        .eq("user_id", userId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading printer account:", error.message);
        setPrinter(null);
      } else if (!data) {
        setPrinter(null);
      } else {
        setPrinter(data as PrinterAccount);
      }

      setPrinterChecked(true);
    };

    void loadPrinterAccount();

    return () => {
      cancelled = true;
    };
  }, [userId, sessionChecked]);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async (printerId: number) => {
      setLoading(true);

      const { data, error } = await supabase
        .from("requests")
        .select(
          "id, printer_id, customer_id, file_name, file_path, file_bucket, file_size, mime_type, material, color, quantity, notes, status, fulfillment_method, fulfillment_notes, delivery_fee, fulfillment_response_at, created_at, accepted_at, in_progress_at, completed_at, declined_at"
        )
        .eq("printer_id", printerId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Error loading requests:", error.message);
        setRequests([]);
        setLoading(false);
        return;
      }

      setRequests((data || []) as RequestRow[]);
      setLoading(false);
    };

    if (!printer?.id) {
      setRequests([]);
      setLoading(false);
      return;
    }

    void loadRequests(printer.id);

    const channel = supabase
      .channel(`printer-requests-${printer.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        (payload) => {
          const record = (payload.new || payload.old) as Partial<RequestRow> | undefined;
          if (record?.printer_id === printer.id) {
            void loadRequests(printer.id);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [printer]);

  const incrementJobsCompleted = async (printerId: number) => {
    const { data: printerRow, error: fetchError } = await supabase
      .from("printers")
      .select("jobs_completed")
      .eq("id", printerId)
      .single();

    if (fetchError) {
      console.error("Error loading jobs_completed:", fetchError.message);
      return;
    }

    const nextValue = ((printerRow as { jobs_completed?: number | null } | null)?.jobs_completed ?? 0) + 1;

    const { error: updateError } = await supabase
      .from("printers")
      .update({ jobs_completed: nextValue })
      .eq("id", printerId);

    if (updateError) {
      console.error("Error incrementing jobs:", updateError.message);
    }
  };

  const updateStatus = async (request: RequestRow, nextStatus: string) => {
    const currentStatus = request.status || "pending";

    const isValidTransition =
      (currentStatus === "pending" &&
        (nextStatus === "accepted" || nextStatus === "declined")) ||
      (currentStatus === "accepted" && nextStatus === "in_progress") ||
      (currentStatus === "in_progress" && nextStatus === "completed");

    if (!isValidTransition) return;

    setUpdatingId(request.id);

    const updates: Record<string, string> = { status: nextStatus };
    const now = new Date().toISOString();

    if (nextStatus === "accepted") updates.accepted_at = now;
    if (nextStatus === "in_progress") updates.in_progress_at = now;
    if (nextStatus === "completed") updates.completed_at = now;
    if (nextStatus === "declined") updates.declined_at = now;

    const { data: updatedRow, error } = await supabase
      .from("requests")
      .update(updates)
      .eq("id", request.id)
      .select("id, status, accepted_at, in_progress_at, completed_at, declined_at")
      .single();

    if (error) {
      console.error("Error updating status:", error.message);
      setUpdatingId(null);
      showTemporaryToast(error.message || "Could not update request status.");
      return;
    }

    if (!updatedRow) {
      setUpdatingId(null);
      showTemporaryToast("Update was blocked or no row was changed.");
      return;
    }

    setRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, ...updates } : r))
    );

    if (printer?.id) {
      const { data, error: refreshError } = await supabase
        .from("requests")
        .select(
          "id, printer_id, customer_id, file_name, file_path, file_bucket, file_size, mime_type, material, color, quantity, notes, status, fulfillment_method, fulfillment_notes, delivery_fee, fulfillment_response_at, created_at, accepted_at, in_progress_at, completed_at, declined_at"
        )
        .eq("printer_id", printer.id)
        .order("created_at", { ascending: false });

      if (refreshError) {
        console.error("Error refreshing requests:", refreshError.message);
      } else {
        setRequests((data || []) as RequestRow[]);
      }
    }

    if (currentStatus === "in_progress" && nextStatus === "completed") {
      await incrementJobsCompleted(request.printer_id);
    }

    setUpdatingId(null);
    showTemporaryToast(`Request #${request.id} marked ${nextStatus.replace("_", " ")}.`);
  };

  const openRequestFile = async (request: RequestRow) => {
    if (!request.file_path || !request.file_bucket) {
      showTemporaryToast("No uploaded file is attached to this request.");
      return;
    }

    setOpeningId(request.id);

    const { data, error } = await supabase.storage
      .from(request.file_bucket)
      .createSignedUrl(request.file_path, SIGNED_URL_EXPIRES_IN_SECONDS, {
        download: request.file_name || undefined,
      });

    if (error || !data?.signedUrl) {
      console.error("Error creating signed URL:", error?.message);
      setOpeningId(null);
      showTemporaryToast("Could not open the uploaded file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setOpeningId(null);
  };

  const saveFulfillmentResponse = async (request: RequestRow) => {
    const draft = fulfillmentDrafts[request.id] || { notes: "", fee: "" };

    setSavingFulfillmentId(request.id);

    const updates: {
      fulfillment_notes: string | null;
      delivery_fee?: number | null;
      fulfillment_response_at: string;
    } = {
      fulfillment_notes: draft.notes.trim() || null,
      fulfillment_response_at: new Date().toISOString(),
    };

    if ((request.fulfillment_method || "") === "delivery") {
      updates.delivery_fee = draft.fee.trim() ? Number(draft.fee) : null;
    }

    const { data: updatedRow, error } = await supabase
      .from("requests")
      .update(updates)
      .eq("id", request.id)
      .select("id, fulfillment_notes, delivery_fee, fulfillment_response_at")
      .single();

    if (error) {
      console.error("Error saving fulfillment response:", error.message);
      showTemporaryToast(error.message || "Could not save fulfillment response.");
      setSavingFulfillmentId(null);
      return;
    }

    if (!updatedRow) {
      showTemporaryToast("Fulfillment response was blocked or no row was changed.");
      setSavingFulfillmentId(null);
      return;
    }

    setRequests((prev) =>
      prev.map((r) =>
        r.id === request.id
          ? {
              ...r,
              fulfillment_notes: updates.fulfillment_notes ?? null,
              delivery_fee: updates.delivery_fee ?? null,
              fulfillment_response_at: updates.fulfillment_response_at,
            }
          : r
      )
    );

    showTemporaryToast("Fulfillment response saved.");
    setSavingFulfillmentId(null);
  };

  const signOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    const clearLocalSessionState = () => {
      setUserId(null);
      setPrinter(null);
      setRequests([]);
      setPrinterChecked(true);
      setSessionChecked(true);
    };

    const clearSupabaseStorage = () => {
      try {
        const clearMatchingKeys = (storage: Storage) => {
          const keysToRemove: string[] = [];
          for (let i = 0; i < storage.length; i += 1) {
            const key = storage.key(i);
            if (!key) continue;
            if (key.includes("sb-") || key.includes("-auth-token") || key.includes("lock:sb-")) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => storage.removeItem(key));
        };

        clearMatchingKeys(window.localStorage);
        clearMatchingKeys(window.sessionStorage);
      } catch (error) {
        console.error("Storage clear error:", error);
      }
    };

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sign out error.";
      console.error("Sign out error:", message);
    } finally {
      clearSupabaseStorage();
      clearLocalSessionState();
      window.location.replace("/?signed_out=1");
    }
  };

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => (r.status || "pending") === "pending").length,
      inProgress: requests.filter((r) => r.status === "in_progress").length,
      completed: requests.filter((r) => r.status === "completed").length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const statusRank: Record<string, number> = {
      pending: 0,
      accepted: 1,
      in_progress: 2,
      completed: 3,
      declined: 4,
    };

    return [...requests]
      .filter((request) => {
        const status = request.status || "pending";
        if (view === "active") return !["completed", "declined"].includes(status);
        if (view === "completed") return ["completed", "declined"].includes(status);
        return true;
      })
      .sort((a, b) => {
        const aStatus = a.status || "pending";
        const bStatus = b.status || "pending";
        const statusDiff = (statusRank[aStatus] ?? 99) - (statusRank[bStatus] ?? 99);
        if (statusDiff !== 0) return statusDiff;

        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [requests, view]);

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (value?: string | null) => {
    return value ? new Date(value).toLocaleString() : "—";
  };

  const statusLabel = (status: string | null) => (status || "pending").replace("_", " ");

  const statusStyle = (status: string | null) => {
    const value = status || "pending";
    if (value === "pending") return "border-white/15 bg-white/5 text-gray-300";
    if (value === "accepted") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    if (value === "in_progress") return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    if (value === "completed") return "border-white/20 bg-white/10 text-gray-200";
    if (value === "declined") return "border-red-500/30 bg-red-500/10 text-red-300";
    return "border-white/15 bg-white/5 text-gray-300";
  };

  if (!sessionChecked || (userId && !printerChecked)) {
    return <div className="min-h-screen bg-black text-white p-8">Loading...</div>;
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-black text-white">
        <main className="mx-auto flex max-w-4xl items-center justify-center px-6 py-24">
          <div className="w-full rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center">
            <h1 className="text-3xl font-bold">Printer sign in required</h1>
            <p className="mt-3 text-gray-400">Sign in with your printer account to manage jobs and open uploaded files.</p>
            <Link href="/auth?mode=sign_in&role=printer&next=/printer" className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-semibold text-black">
              Go to Auth
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!printer) {
    return (
      <div className="min-h-screen bg-black text-white">
        <main className="mx-auto flex max-w-4xl items-center justify-center px-6 py-24">
          <div className="w-full rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center">
            <h1 className="text-3xl font-bold">No printer account linked</h1>
            <p className="mt-3 text-gray-400">This account is signed in, but it is not set up as a printer yet.</p>
            <Link href="/become-printer" className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-semibold text-black">
              Become a Printer
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image src="/logo.svg" alt="LayerShift Logo" width={180} height={48} className="h-12 w-auto object-contain" priority />
            <div className="hidden md:block">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Printer Dashboard</p>
              <p className="text-sm text-gray-400">Manage incoming local jobs</p>
            </div>
          </div>

          <button
            onClick={signOut}
            disabled={isSigningOut}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <p className="text-sm text-gray-400">Printer account</p>
          <h1 className="mt-1 text-3xl font-bold">{printer.name}</h1>
          <p className="mt-2 text-sm text-gray-400">Review jobs, open uploaded files, and move requests through each stage.</p>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><p className="text-sm text-gray-400">Total</p><p className="mt-2 text-3xl font-bold">{stats.total}</p></div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><p className="text-sm text-gray-400">Pending</p><p className="mt-2 text-3xl font-bold">{stats.pending}</p></div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><p className="text-sm text-gray-400">In Progress</p><p className="mt-2 text-3xl font-bold">{stats.inProgress}</p></div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><p className="text-sm text-gray-400">Completed</p><p className="mt-2 text-3xl font-bold">{stats.completed}</p></div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Assigned Requests</h2>
              <p className="mt-1 text-sm text-gray-400">Open files, review job details, and move each request forward without losing track.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["active", "completed", "all"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    view === mode ? "bg-orange-500 text-black" : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {mode === "active" ? "Active" : mode === "completed" ? "Completed" : "All"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="mt-8 text-sm text-gray-400">Loading requests...</p>
          ) : filteredRequests.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
              <p className="text-lg font-medium text-white">No requests here</p>
              <p className="mt-2 text-sm text-gray-400">Try another tab or wait for new print requests to come in.</p>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {filteredRequests.map((request) => {
                const status = request.status || "pending";
                const isPending = status === "pending";
                const isAccepted = status === "accepted";
                const isInProgress = status === "in_progress";
                const isCompleted = status === "completed";
                const isDeclined = status === "declined";
                const isLocked = isCompleted || isDeclined;
                const busy = updatingId === request.id;
                const opening = openingId === request.id;

                return (
                  <div
                    key={request.id}
                    className={`rounded-2xl border p-5 transition ${
                      isCompleted
                        ? "border-white/10 bg-zinc-800/80 opacity-80"
                        : isDeclined
                        ? "border-red-500/10 bg-red-500/5 opacity-75"
                        : "border-white/10 bg-black/30 hover:border-orange-500/30"
                    }`}
                  >
                    <div className={`flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between ${isLocked ? "opacity-80" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="truncate text-lg font-semibold text-white">{request.file_name || "Unnamed file"}</h3>
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(status)}`}>
                            {statusLabel(status)}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <div><p className="text-xs uppercase tracking-wide text-gray-500">Material</p><p className="mt-1 text-sm text-gray-200">{request.material || "Not specified"}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-gray-500">Color</p><p className="mt-1 text-sm text-gray-200">{request.color || "Not specified"}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-gray-500">Quantity</p><p className="mt-1 text-sm text-gray-200">{request.quantity ?? 1}</p></div>
                          <div><p className="text-xs uppercase tracking-wide text-gray-500">File</p><p className="mt-1 text-sm text-gray-200">{request.mime_type || "Unknown type"} • {formatBytes(request.file_size)}</p></div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Notes</p>
                          <p className="mt-1 text-sm text-gray-200">{request.notes || "No special instructions."}</p>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            onClick={() => openRequestFile(request)}
                            disabled={opening || !request.file_path || !request.file_bucket}
                            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {opening ? "Opening..." : "Open Uploaded File"}
                          </button>

                          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">Request #{request.id}</div>
                        </div>
                      </div>

                      <div className="lg:w-[280px]">
                        <div className="mb-2 text-xs text-gray-500 lg:text-right">
                          {isPending && "Next step: accept or decline this request."}
                          {isAccepted && "Next step: start the print job."}
                          {isInProgress && "Next step: mark the print as completed."}
                          {isCompleted && "This request has been completed."}
                          {isDeclined && "This request was declined."}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            disabled={!isPending || busy}
                            onClick={() => updateStatus(request, "accepted")}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                              isPending && !busy ? "bg-orange-500 text-black hover:opacity-90" : "cursor-not-allowed bg-gray-700 text-gray-300"
                            }`}
                          >
                            {busy && isPending ? "Updating..." : isAccepted || isInProgress || isCompleted ? "Accepted" : isDeclined ? "Unavailable" : "Accept"}
                          </button>

                          <button
                            disabled={!isAccepted || busy}
                            onClick={() => updateStatus(request, "in_progress")}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                              isAccepted && !busy ? "bg-blue-500 text-black hover:opacity-90" : isInProgress ? "bg-blue-500 text-black" : "cursor-not-allowed bg-gray-700 text-gray-300"
                            }`}
                          >
                            {busy && isAccepted ? "Updating..." : isInProgress ? "In Progress" : isCompleted ? "Started" : "Start Print"}
                          </button>

                          <button
                            disabled={!isInProgress || busy}
                            onClick={() => updateStatus(request, "completed")}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                              isInProgress && !busy ? "bg-white text-black hover:opacity-90" : isCompleted ? "bg-white text-black" : "cursor-not-allowed bg-gray-700 text-gray-300"
                            }`}
                          >
                            {busy && isInProgress ? "Updating..." : isCompleted ? "Completed" : "Complete"}
                          </button>

                          <button
                            disabled={!isPending || busy}
                            onClick={() => updateStatus(request, "declined")}
                            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                              isPending && !busy ? "border-white/20 text-white hover:bg-white/10" : "cursor-not-allowed border-gray-700 text-gray-500"
                            }`}
                          >
                            {busy && isPending ? "Updating..." : isDeclined ? "Declined" : "Decline"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showToast && (
        <div className="fixed right-6 top-6 z-50">
          <div className="rounded-2xl border border-orange-500/20 bg-zinc-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur">
            <p className="text-sm font-medium text-orange-400">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
