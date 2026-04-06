"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [selectedPrinter, setSelectedPrinter] = useState<{
    id: number;
    name: string;
    email: string;
  } | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");

  function showMessage(text: string) {
    setMessage(text);
    console.log(text);
  }

  function handleFileChange(file: File | null) {
    if (!file) return;
    setUploadedFile(file);
    setFileName(file.name);
    showMessage(`File selected: ${file.name}`);
  }

  function handleSelectPrinter() {
    if (!customerEmail.trim()) {
      showMessage("Enter your email first, then click Select Test Printer.");
      return;
    }

    const printer = {
      id: 1,
      name: "Test Printer",
      email: customerEmail.trim(),
    };

    setSelectedPrinter(printer);
    showMessage(`Selected printer: ${printer.name} (${printer.email})`);
  }

  async function handleSendRequest() {
    if (!selectedPrinter) {
      showMessage("Select the test printer first.");
      return;
    }

    if (!uploadedFile) {
      showMessage("Upload a file first.");
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      showMessage("Enter your name and email.");
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
        showMessage(error.message || "Could not send request.");
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
          showMessage(emailJson?.error || "Request saved, but email failed.");
        } else {
          console.log("Email API success:", emailJson);
          showMessage("Request + email sent.");
        }
      } catch (emailErr) {
        console.error("Email request crashed:", emailErr);
        showMessage("Request saved, but email request crashed.");
      }
    } catch (err: any) {
      console.error("Unexpected request error:", err);
      showMessage(err?.message || "Something went wrong.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Email Debug Page</h1>

      <p style={{ marginTop: "16px" }}>
        Temporary test page to verify request save + email notification.
      </p>

      <div style={{ marginTop: "24px" }}>
        <input
          type="file"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
        />
      </div>

      <div style={{ marginTop: "16px" }}>
        <input
          type="text"
          placeholder="Your name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          style={{ width: "320px", padding: "10px" }}
        />
      </div>

      <div style={{ marginTop: "16px" }}>
        <input
          type="email"
          placeholder="Your email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          style={{ width: "320px", padding: "10px" }}
        />
      </div>

      <div style={{ marginTop: "16px" }}>
        <textarea
          placeholder="Notes"
          value={requestNotes}
          onChange={(e) => setRequestNotes(e.target.value)}
          rows={4}
          style={{ width: "320px", padding: "10px" }}
        />
      </div>

      <div style={{ marginTop: "16px" }}>
        <button
          type="button"
          onClick={handleSelectPrinter}
          style={{ padding: "10px 16px", marginRight: "12px" }}
        >
          Select Test Printer
        </button>

        <button
          type="button"
          onClick={handleSendRequest}
          disabled={requesting}
          style={{ padding: "10px 16px" }}
        >
          {requesting ? "Sending..." : "Send Request"}
        </button>
      </div>

      <div style={{ marginTop: "24px", fontWeight: 700 }}>
        {fileName ? `File: ${fileName}` : "No file selected"}
      </div>

      <div style={{ marginTop: "12px", fontWeight: 700 }}>
        {selectedPrinter
          ? `Selected printer: ${selectedPrinter.name} (${selectedPrinter.email})`
          : "No printer selected"}
      </div>

      <div style={{ marginTop: "16px", color: "#cc0000" }}>{message}</div>
    </main>
  );
}