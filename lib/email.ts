import { Resend } from "resend";

const BRAND_NAME = "LayerShift";
const FROM_EMAIL = "LayerShift <hello@layershift.ca>";
const LOGO_URL = "https://layershift.ca/logo-email.png";
const DEFAULT_REQUEST_LINK = "https://layershift.ca";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return new Resend(apiKey);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(value?: string | null, fallback = "Not provided") {
  const trimmed = value?.trim();
  return escapeHtml(trimmed && trimmed.length > 0 ? trimmed : fallback);
}

function emailShell({
  eyebrow,
  title,
  intro,
  body,
  ctaLabel,
  ctaHref,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  footer: string;
}) {
  const ctaBlock =
    ctaLabel && ctaHref
      ? `
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 10px 0;">
          <tr>
            <td align="center" style="border-radius:10px;background-color:#f97316;">
              <a href="${escapeHtml(ctaHref)}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
        </table>
      `
      : "";

  return `
    <div style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#111111;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="background-color:#0f0f0f;padding:28px 32px;text-align:center;border-bottom:2px solid #f97316;">
                  <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="220" style="display:block;margin:0 auto 12px auto;max-width:220px;width:100%;height:auto;" />
                  <div style="font-size:13px;line-height:20px;color:#d1d5db;letter-spacing:0.4px;">
                    ${escapeHtml(eyebrow)}
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:36px 32px 20px 32px;">
                  <h1 style="margin:0 0 16px 0;font-size:26px;line-height:34px;color:#111111;">
                    ${escapeHtml(title)}
                  </h1>
                  <p style="margin:0 0 20px 0;font-size:16px;line-height:26px;color:#333333;">
                    ${intro}
                  </p>

                  ${body}

                  ${ctaBlock}
                </td>
              </tr>

              <tr>
                <td style="padding:22px 32px;background-color:#fafafa;border-top:1px solid #eeeeee;">
                  <p style="margin:0;font-size:13px;line-height:22px;color:#777777;text-align:center;">
                    ${escapeHtml(footer)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

type PrinterRequestEmailArgs = {
  printerEmail: string;
  printerName?: string | null;
  customerName: string;
  customerEmail: string;
  fileName: string;
  material?: string | null;
  quantity?: number | string | null;
  notes?: string | null;
  dashboardLink?: string;
};

export async function sendPrinterRequestEmail({
  printerEmail,
  printerName,
  customerName,
  customerEmail,
  fileName,
  material,
  quantity,
  notes,
  dashboardLink = DEFAULT_REQUEST_LINK,
}: PrinterRequestEmailArgs) {
  const resend = getResend();

  const html = emailShell({
    eyebrow: "Printer dashboard notification",
    title: "New print request",
    intro: `Hi ${safeText(printerName, "Printer")},<br /><br />A customer has submitted a new print request in your area. Review it and respond as quickly as possible.`,
    body: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background-color:#fafafa;border:1px solid #e5e7eb;border-radius:12px;">
        <tr>
          <td style="padding:20px 20px 8px 20px;font-size:14px;font-weight:bold;color:#111111;">
            Request details
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 20px 20px;">
            <div style="font-size:15px;line-height:24px;color:#444444;">
              <strong>Customer:</strong> ${safeText(customerName)}<br />
              <strong>Email:</strong> ${safeText(customerEmail)}<br />
              <strong>File:</strong> ${safeText(fileName)}<br />
              <strong>Material:</strong> ${safeText(material, "To be confirmed")}<br />
              <strong>Quantity:</strong> ${safeText(
                quantity !== undefined && quantity !== null ? String(quantity) : undefined,
                "To be confirmed",
              )}<br />
              <strong>Notes:</strong> ${safeText(notes, "No additional notes provided.")}
            </div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 28px 0;font-size:15px;line-height:25px;color:#444444;">
        Customers usually move fast. A quick response improves your chances of winning the job.
      </p>
    `,
    ctaLabel: "Open Dashboard",
    ctaHref: dashboardLink,
    footer: "LayerShift • Local print jobs delivered to your inbox",
  });

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [printerEmail],
    subject: `New print request in your area – ${BRAND_NAME}`,
    html,
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
  material,
  quantity,
  requestLink = DEFAULT_REQUEST_LINK,
}: {
  customerName: string;
  customerEmail: string;
  fileName: string;
  printerName?: string | null;
  material?: string | null;
  quantity?: number | string | null;
  requestLink?: string;
}) {
  const resend = getResend();

  const html = emailShell({
    eyebrow: "Local 3D printing, simplified",
    title: "Your request has been sent",
    intro: `Hi ${safeText(customerName)},<br /><br />Your 3D print request has been successfully submitted. We’ve notified ${safeText(
      printerName,
      "a local printer",
    )}, and you’ll receive an update as soon as they respond.`,
    body: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background-color:#fafafa;border:1px solid #e5e7eb;border-radius:12px;">
        <tr>
          <td style="padding:20px 20px 8px 20px;font-size:14px;font-weight:bold;color:#111111;">
            Request details
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 20px 20px;">
            <div style="font-size:15px;line-height:24px;color:#444444;">
              <strong>File:</strong> ${safeText(fileName)}<br />
              <strong>Material:</strong> ${safeText(material, "To be confirmed")}<br />
              <strong>Quantity:</strong> ${safeText(
                quantity !== undefined && quantity !== null ? String(quantity) : undefined,
                "To be confirmed",
              )}
            </div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 28px 0;font-size:15px;line-height:25px;color:#444444;">
        You don’t need to do anything right now. We’ll keep you updated at each step.
      </p>

      <p style="margin:18px 0 0 0;font-size:14px;line-height:22px;color:#666666;">
        If you have any questions, just reply to this email.
      </p>
    `,
    ctaLabel: "View Request",
    ctaHref: requestLink,
    footer: "LayerShift • Connecting customers with local 3D printers",
  });

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [customerEmail],
    subject: `Your print request has been sent – ${BRAND_NAME}`,
    html,
  });

  if (error) {
    console.error("❌ RESEND ERROR FULL:", error);
    throw new Error(JSON.stringify(error));
  }

  return data;
}

export async function sendCustomerAcceptedEmail({
  customerName,
  customerEmail,
  requestLink = DEFAULT_REQUEST_LINK,
}: {
  customerName: string;
  customerEmail: string;
  requestLink?: string;
}) {
  const resend = getResend();

  const html = emailShell({
    eyebrow: "Order status update",
    title: "Your print has been accepted",
    intro: `Hi ${safeText(customerName)},<br /><br />Good news. A local printer has accepted your request and is now preparing your job.`,
    body: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background-color:#fff7ed;border:1px solid #fdba74;border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;font-size:15px;line-height:24px;color:#7c2d12;">
            We’ll notify you again once your print is complete and ready for pickup, delivery, or shipping.
          </td>
        </tr>
      </table>
    `,
    ctaLabel: "View Status",
    ctaHref: requestLink,
    footer: "LayerShift • Real local printing, real-time updates",
  });

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [customerEmail],
    subject: `Your print has been accepted – ${BRAND_NAME}`,
    html,
  });

  if (error) {
    console.error("❌ RESEND ERROR FULL:", error);
    throw new Error(JSON.stringify(error));
  }

  return data;
}

export async function sendCustomerCompletedEmail({
  customerName,
  customerEmail,
  fulfillmentMethod,
  requestLink = DEFAULT_REQUEST_LINK,
}: {
  customerName: string;
  customerEmail: string;
  fulfillmentMethod?: string | null;
  requestLink?: string;
}) {
  const resend = getResend();

  const html = emailShell({
    eyebrow: "Your order is complete",
    title: "Your print is ready",
    intro: `Hi ${safeText(customerName)},<br /><br />Your print has been completed and is now ready.`,
    body: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background-color:#fafafa;border:1px solid #e5e7eb;border-radius:12px;">
        <tr>
          <td style="padding:20px 20px 8px 20px;font-size:14px;font-weight:bold;color:#111111;">
            Fulfillment details
          </td>
        </tr>
        <tr>
          <td style="padding:0 20px 20px 20px;">
            <div style="font-size:15px;line-height:24px;color:#444444;">
              <strong>Method:</strong> ${safeText(fulfillmentMethod, "To be confirmed")}
            </div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 28px 0;font-size:15px;line-height:25px;color:#444444;">
        Your printer will coordinate the next step with you. If anything looks wrong, reply to this email and we’ll help sort it out.
      </p>
    `,
    ctaLabel: "View Order",
    ctaHref: requestLink,
    footer: "LayerShift • Local production with a smoother customer experience",
  });

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [customerEmail],
    subject: `Your print is ready – ${BRAND_NAME}`,
    html,
  });

  if (error) {
    console.error("❌ RESEND ERROR FULL:", error);
    throw new Error(JSON.stringify(error));
  }

  return data;
}
