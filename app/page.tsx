async function handleSendRequest() {
  if (!selectedPrinter || !uploadedFile) {
    showToast("Missing printer or file.");
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

    // 🔥 EMAIL DEBUG BLOCK (THIS IS WHAT YOU WERE MISSING)
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
        console.error("❌ Email API failed:", emailJson);
        showToast(emailJson?.error || "Request saved, but email failed.");
      } else {
        console.log("✅ Email API success:", emailJson);
      }
    } catch (emailErr) {
      console.error("❌ Email request crashed:", emailErr);
      showToast("Request saved, but email failed.");
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