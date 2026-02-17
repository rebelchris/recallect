import { onQrUpdate, onStatusUpdate, getWhatsAppStatus } from "@/lib/whatsapp";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send current status immediately
      const current = getWhatsAppStatus();
      if (current.qrDataUrl) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ qr: current.qrDataUrl })}\n\n`)
        );
      }

      const unsubQr = onQrUpdate((qrDataUrl: string) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ qr: qrDataUrl })}\n\n`)
          );
        } catch {
          // stream closed
        }
      });

      const unsubStatus = onStatusUpdate((status: string) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status })}\n\n`)
          );
          if (status === "ready" || status === "disconnected") {
            unsubQr();
            unsubStatus();
            controller.close();
          }
        } catch {
          // stream closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
