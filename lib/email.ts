import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

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
  if (!printerEmail) {
    throw new Error("Printer email is missing.");
  }

  const resend = getResend();

  const safePrinterName = printerName?.trim() || "Printer";
  const safeNotes = notes?.trim() || "No notes provided.";

  const { data, error } = await resend.emails.send({
    from: "LayerShift <onboarding@resend.dev>",
    to: [printerEmail],
    subject: `New print request from ${customerName}`,
    html: `
      <div style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
          <div style="background:#181818;border:1px solid #f97316;border-radius:16px;overflow:hidden;">
            <div style="padding:24px 24px 12px 24px;border-bottom:1px solid rgba(249,115,22,0.25);">
              <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#f97316;font-weight:700;">
                LayerShift
              </div>
              <h1 style="margin:12px 0 0 0;font-size:24px;line-height:1.3;color:#ffffff;">
                New 3D print request
              </h1>
            </div>

            <div style="padding:24px;">
              <p style="margin:0 0 16px 0;color:#e5e7eb;font-size:15px;line-height:1.7;">
                Hi ${safePrinterName},
              </p>

              <p style="margin:0 0 20px 0;color:#d1d5db;font-size:15px;line-height:1.7;">
                You have received a new print request through LayerShift.
              </p>

              <div style="background:#101010;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;">
                <p style="margin:0 0 10px 0;color:#ffffff;font-size:14px;">
                  <strong>Customer:</strong> ${customerName}
                </p>
                <p style="margin:0 0 10px 0;color:#ffffff;font-size:14px;">
                  <strong>Email:</strong> ${customerEmail}
                </p>
                <p style="margin:0 0 10px 0;color:#ffffff;font-size:14px;">
                  <strong>File:</strong> ${fileName}
                </p>
                <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.6;">
                  <strong>Notes:</strong> ${safeNotes}
                </p>
              </div>

              <p style="margin:20px 0 0 0;color:#9ca3af;font-size:13px;line-height:1.7;">
                Log in to your printer dashboard to review and respond to this request.
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
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
  if (!customerEmail) {
    throw new Error("Customer email is missing.");
  }

  const resend = getResend();

  const safePrinterName = printerName?.trim() || "a local printer";

  const { data, error } = await resend.emails.send({
    from: "LayerShift <onboarding@resend.dev>",
    to: [customerEmail],
    subject: "Your LayerShift request was sent",
    html: `
      <div style="margin:0;padding:0;background:#111111;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
          <div style="background:#181818;border:1px solid #f97316;border-radius:16px;overflow:hidden;">
            <div style="padding:24px 24px 12px 24px;border-bottom:1px solid rgba(249,115,22,0.25);">
              <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#f97316;font-weight:700;">
                LayerShift
              </div>
              <h1 style="margin:12px 0 0 0;font-size:24px;line-height:1.3;color:#ffffff;">
                Request sent successfully
              </h1>
            </div>

            <div style="padding:24px;">
              <p style="margin:0 0 16px 0;color:#e5e7eb;font-size:15px;line-height:1.7;">
                Hi ${customerName},
              </p>

              <p style="margin:0 0 20px 0;color:#d1d5db;font-size:15px;line-height:1.7;">
                Your print request for <strong>${fileName}</strong> has been sent to ${safePrinterName}.
              </p>

              <div style="background:#101010;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;">
                <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.7;">
                  We’ll keep the process simple and local. You can expect a response once the printer reviews your request.
                </p>
              </div>

              <p style="margin:20px 0 0 0;color:#9ca3af;font-size:13px;line-height:1.7;">
                Thanks for using LayerShift.
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}