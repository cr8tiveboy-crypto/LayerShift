import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

const TEST_EMAIL = "din.lad@live.ca"; // force all emails here for testing

type PrinterRequestEmailArgs = {
  printerEmail: string;
  printerName?: string | null;
  customerName: string;
  customerEmail: string;
  fileName: string;
  notes?: string | null;
};

export async function sendPrinterRequestEmail({
  printerEmail,
  printerName,
  customerName,
  customerEmail,
  fileName,
  notes,
}: PrinterRequestEmailArgs) {
  const resend = getResend();

  const safePrinterName = printerName?.trim() || "Printer";
  const safeNotes = notes?.trim() || "No notes provided.";

  const { data, error } = await resend.emails.send({
    from: "LayerShift <onboarding@resend.dev>",
    to: [TEST_EMAIL],
    subject: `New print request from ${customerName}`,
    html: `
      <div style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
          <div style="background:#181818;border:1px solid #f97316;border-radius:16px;overflow:hidden;">
            <div style="padding:24px;border-bottom:1px solid rgba(249,115,22,0.25);">
              <div style="font-size:12px;color:#f97316;font-weight:700;">LayerShift</div>
              <h1 style="margin-top:12px;color:#fff;">New 3D print request</h1>
            </div>

            <div style="padding:24px;">
              <p style="color:#e5e7eb;">Hi ${safePrinterName},</p>

              <p style="color:#d1d5db;">
                You have received a new print request through LayerShift.
              </p>

              <div style="background:#101010;border-radius:12px;padding:16px;">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                <p><strong>File:</strong> ${fileName}</p>
                <p><strong>Notes:</strong> ${safeNotes}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("❌ RESEND ERROR FULL:", error);
    throw new Error(JSON.stringify(error));
  }

  return data;
}

export async function sendCustomerConfirmationEmail({
  customerName,
  customerEmail,
  fileName,
  printerName,
}: {
  customerName: string;
  customerEmail: string;
  fileName: string;
  printerName?: string | null;
}) {
  const resend = getResend();

  const safePrinterName = printerName?.trim() || "a local printer";

  const { data, error } = await resend.emails.send({
    from: "LayerShift <onboarding@resend.dev>",
    to: [TEST_EMAIL],
    subject: "Your LayerShift request was sent",
    html: `
      <div style="padding:20px;background:#111;color:#fff;">
        <h2>Request sent</h2>
        <p>Hi ${customerName},</p>
        <p>Your request for <strong>${fileName}</strong> was sent to ${safePrinterName}.</p>
      </div>
    `,
  });

  if (error) {
    console.error("❌ RESEND ERROR FULL:", error);
    throw new Error(JSON.stringify(error));
  }

  return data;
}
