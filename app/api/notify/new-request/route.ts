import { NextResponse } from "next/server";
import {
  sendCustomerConfirmationEmail,
  sendPrinterRequestEmail,
} from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Incoming email request:", body);

    console.log(
      "RESEND key present:",
      Boolean(process.env.RESEND_API_KEY),
      process.env.RESEND_API_KEY
        ? `length=${process.env.RESEND_API_KEY.length}`
        : "missing"
    );

    const {
      printerEmail,
      printerName,
      customerName,
      customerEmail,
      fileName,
      notes,
    } = body;

    if (!printerEmail || !customerEmail || !customerName || !fileName) {
      return NextResponse.json(
        { error: "Missing required email fields." },
        { status: 400 }
      );
    }

    const printerResult = await sendPrinterRequestEmail({
      printerEmail,
      printerName,
      customerName,
      customerEmail,
      fileName,
      notes,
    });

    const customerResult = await sendCustomerConfirmationEmail({
      customerName,
      customerEmail,
      fileName,
      printerName,
    });

    return NextResponse.json({
      success: true,
      printerResult,
      customerResult,
    });
  } catch (err: any) {
    console.error("EMAIL ROUTE ERROR:", err);

    return NextResponse.json(
      {
        error: err?.message || "Email failed",
        stack:
          process.env.NODE_ENV !== "production" ? err?.stack : undefined,
      },
      { status: 500 }
    );
  }
}