import { NextResponse } from "next/server";
import {
  sendCustomerConfirmationEmail,
  sendPrinterRequestEmail,
} from "@/lib/email";

type NewRequestEmailBody = {
  printerEmail?: string;
  printerName?: string | null;
  customerName?: string;
  customerEmail?: string;
  fileName?: string;
  notes?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NewRequestEmailBody;

    const printerEmail = body.printerEmail?.trim();
    const printerName = body.printerName?.trim() || null;
    const customerName = body.customerName?.trim();
    const customerEmail = body.customerEmail?.trim();
    const fileName = body.fileName?.trim();
    const notes = body.notes?.trim() || null;

    if (!printerEmail || !customerName || !customerEmail || !fileName) {
      return NextResponse.json(
        { error: "Missing required email fields." },
        { status: 400 }
      );
    }

    await sendPrinterRequestEmail({
      printerEmail,
      printerName,
      customerName,
      customerEmail,
      fileName,
      notes,
    });

    await sendCustomerConfirmationEmail({
      customerName,
      customerEmail,
      fileName,
      printerName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Failed to send emails." },
      { status: 500 }
    );
  }
}
