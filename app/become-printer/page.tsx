"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function BecomePrinterPage() {
  const [step, setStep] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [shopName, setShopName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [materials, setMaterials] = useState<string[]>(["PLA"]);

  const [isSaving, setIsSaving] = useState(false);
  const [isAuthing, setIsAuthing] = useState(false);
  const [message, setMessage] = useState("");

  const toggleMaterial = (mat: string) => {
    setMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
    );
  };

  const normalizedPostal = postalCode.replace(/\s+/g, "").toUpperCase().slice(0, 3);
  const canContinueAuth = email.trim().length > 3 && password.trim().length >= 6;
  const canContinueSetup = shopName.trim().length > 1 && normalizedPostal.length >= 3;
  const canActivate = canContinueSetup && materials.length > 0 && !isSaving;

  const handleAuth = async () => {
    if (!canContinueAuth) {
      setMessage("Enter a valid email and a password with at least 6 characters.");
      return;
    }

    setIsAuthing(true);
    setMessage("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error("Could not create account.");
        }

        const { error: retrySignInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (retrySignInError) {
          throw retrySignInError;
        }
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error("Auth session missing");

      setStep(1);
    } catch (e: any) {
      setMessage(e?.message || "Could not continue.");
    } finally {
      setIsAuthing(false);
    }
  };

  const activate = async () => {
    if (!canActivate) return;

    setIsSaving(true);
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error("Auth session missing");

      const user = session.user;

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        role: "printer",
      });

      if (profileError) throw profileError;

      const payload = {
        user_id: user.id,
        name: shopName.trim(),
        postal_code: normalizedPostal,
        materials,
        jobs_completed: 0,
        active: true,
      };

      const { data: existing, error: existingError } = await supabase
        .from("printers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("printers")
          .update(payload)
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("printers").insert(payload);

        if (insertError) throw insertError;
      }

      setMessage("You're live. Redirecting...");

      window.setTimeout(() => {
        window.location.href = "/printer";
      }, 500);
    } catch (e: any) {
      setMessage(e?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="LayerShift"
              width={180}
              height={50}
              priority
              className="h-10 w-auto object-contain"
            />
          </a>
        </div>
      </header>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          {step === 0 && (
            <>
              <h1 className="text-4xl font-bold">Create your account</h1>
              <p className="mt-3 text-gray-400">
                Sign in or create an account to activate your printer listing.
              </p>

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-6 w-full rounded-xl border border-white/20 bg-black p-3 outline-none"
              />

              <div className="relative mt-4">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-black p-3 pr-14 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/60 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button
                disabled={!canContinueAuth || isAuthing}
                onClick={handleAuth}
                className="mt-6 w-full rounded-xl bg-orange-500 py-3 text-black disabled:opacity-50"
              >
                {isAuthing ? "Continuing..." : "Continue"}
              </button>

              {message && <p className="mt-3 text-orange-400">{message}</p>}
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-4xl font-bold">Your setup</h1>
              <p className="mt-3 text-gray-400">
                Finish this in 60 seconds and start receiving local requests.
              </p>

              <input
                placeholder="Printer / Shop Name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-6 w-full rounded-xl border border-white/20 bg-black p-3 outline-none"
              />

              <input
                placeholder="Postal Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-4 w-full rounded-xl border border-white/20 bg-black p-3 outline-none"
              />

              <button
                disabled={!canContinueSetup}
                onClick={() => setStep(2)}
                className="mt-6 w-full rounded-xl bg-orange-500 py-3 text-black disabled:opacity-50"
              >
                Continue
              </button>

              {message && <p className="mt-3 text-orange-400">{message}</p>}
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-4xl font-bold">Materials</h1>
              <p className="mt-3 text-gray-400">What materials can you print?</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {["PLA", "PETG", "ABS", "TPU"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMaterial(m)}
                    className={`rounded-full px-4 py-2 ${
                      materials.includes(m)
                        ? "bg-orange-500 text-black"
                        : "border border-white/20 text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-gray-500">
                You can edit everything later. This just gets you live.
              </p>

              <button
                disabled={!canActivate}
                onClick={activate}
                className="mt-6 w-full rounded-xl bg-orange-500 py-3 text-black disabled:opacity-50"
              >
                {isSaving ? "Starting..." : "Start Receiving Jobs"}
              </button>

              {message && <p className="mt-3 text-orange-400">{message}</p>}
            </>
          )}
        </div>
      </div>

      <footer className="border-t border-white/10 p-6 text-center text-white/50">
        © 2026 LayerShift
      </footer>
    </div>
  );
}