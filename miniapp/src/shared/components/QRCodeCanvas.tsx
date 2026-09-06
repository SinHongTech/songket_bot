import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeCanvasProps {
  value: string;
  size?: number;
}

export default function QRCodeCanvas({ value, size = 200 }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: "#1a1200",
          light: "#FFFFFF",
        },
      }).catch(err => {
        console.error("QR Code render error:", err);
      });
    }
  }, [value, size]);

  return (
    <div
      style={{
        display: "inline-block",
        background: "#FFFFFF",
        padding: "10px",
        borderRadius: "14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        lineHeight: 0,
      }}
    >
      <canvas ref={canvasRef} style={{ width: size, height: size, display: "block" }} />
    </div>
  );
}
