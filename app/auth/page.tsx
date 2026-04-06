"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase"; // ✅ FIXED

type Mode = "sign_in" | "sign_up";
type Role = "customer" | "printer";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const hasCheckedSession = useRef(false);

  const [mode, setMode] = useState<Mode>("sign_in");
  const [role, setRole] = useState<Role>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [printerName, setPrinterName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const nextMode = searchParams.get("mode");
    const nextRole = searchParams.get("role");

    if (nextMode === "sign_in" || nextMode === "sign_up") setMode(nextMode);
    if (nextRole === "customer" || nextRole === "printer") setRole(nextRole);
  }, [searchParams]);

  useEffect(() => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) return;

      const next = searchParams.get("next");
      const requestedRole = searchParams.get("role");
      const requestedMode = searchParams.get("mode");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const currentRole = profileData?.role;

      if (requestedMode === "sign_up" && requestedRole === "printer" && currentRole !== "printer") return;

      if (next) {
        window.location.href = next;
        return;
      }

      window.location.href = currentRole === "printer" ? "/printer" : "/";
    };

    checkSession();
  }, [searchParams]);

  const createOrUpdatePrinter = async (userId: string, shopName: string, userEmail: string) => {
    const fallbackName = shopName.trim() || userEmail.split("@")[0] || "Printer";

    const { data: existingPrinter } = await supabase
      .from("printers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      name: fallbackName,
      postal_code: "L4N",
      distance: "Local",
      price: "$",
      turnaround: "24h",
      materials: ["PLA"],
      rating: 5,
      jobs_completed: 0,
    };

    if (existingPrinter?.id) {
      await supabase.from("printers").update(payload).eq("id", existingPrinter.id);
    } else {
      await supabase.from("printers").insert(payload);
    }
  };

  const signInAfterSignup = async () => {
    await supabase.auth.signInWithPassword({ email, password });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "sign_up") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw new Error(error.message);

        const user = data.user;
        if (!user) throw new Error("User not created");

        await supabase.from("profiles").upsert({
          id: user.id,
          role,
        });

        if (role === "printer") {
          await createOrUpdatePrinter(user.id, printerName, email);
        }

        await signInAfterSignup();

        window.location.href = role === "printer" ? "/become-printer" : "/";
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const { data: userData } = await supabase.auth.getUser();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user?.id)
        .maybeSingle();

      window.location.href = profileData?.role === "printer" ? "/printer" : "/";
    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto flex max-w-7xl px-6 py-16">
        <div className="w-full max-w-md mx-auto bg-zinc-900 p-6 rounded-2xl border border-white/10">
          <h1 className="text-2xl font-bold mb-6">
            {mode === "sign_in" ? "Sign In" : "Create Account"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-black border border-white/20"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-black border border-white/20"
              required
            />

            {mode === "sign_up" && role === "printer" && (
              <input
                type="text"
                placeholder="Printer Name"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                className="w-full p-3 rounded bg-black border border-white/20"
                required
              />
            )}

            {message && <p className="text-orange-400 text-sm">{message}</p>}

            <button className="w-full bg-orange-500 py-3 rounded text-black font-semibold">
              {loading ? "Working..." : mode === "sign_in" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}