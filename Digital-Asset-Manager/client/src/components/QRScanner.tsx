import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Scan, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  className?: string;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 300);
  } catch {
    // Audio not available — silent fallback
  }
}

export function QRScanner({ onScan, className }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>(`scanner-${Date.now()}`);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        if (scannerRef.current) {
          scannerRef.current.clear();
          scannerRef.current = null;
        }
        if (isMountedRef.current) {
          setIsScanning(false);
        }
      });
    } else {
      setIsScanning(false);
    }
  }, []);

  const startScanning = useCallback(() => {
    setScanSuccess(false);
    setIsScanning(true);

    setTimeout(() => {
      if (!isMountedRef.current) return;

      const scanner = new Html5Qrcode(containerRef.current, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });

      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.5,
          disableFlip: false,
        },
        (decodedText) => {
          if (!isMountedRef.current) return;
          // Visual feedback
          setScanSuccess(true);
          // Audio beep
          playBeep();
          // Vibration
          if (navigator.vibrate) navigator.vibrate(100);
          // Callback
          onScan(decodedText);
          // Stop after a short delay so the user sees the green flash
          setTimeout(() => {
            if (isMountedRef.current) {
              stopScanning();
              setTimeout(() => setScanSuccess(false), 1500);
            }
          }, 400);
        },
        () => {
          // Ignore scan miss errors
        }
      ).catch((err) => {
        console.error("Scanner start error:", err);
        if (isMountedRef.current) {
          setIsScanning(false);
        }
      });
    }, 150);
  }, [onScan, stopScanning]);

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {scanSuccess && (
        <div className="flex items-center gap-2 p-3 mb-3 rounded-md bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">Barcode scanned successfully</span>
        </div>
      )}

      {!isScanning ? (
        <button
          onClick={startScanning}
          className="w-full h-48 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-primary/5 hover:border-primary transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Scan className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-muted-foreground font-medium">Click to Scan</p>
            <p className="text-xs text-muted-foreground/70 mt-1">QR, EAN, UPC, CODE-128 supported</p>
          </div>
        </button>
      ) : (
        <div className={cn(
          "relative overflow-hidden rounded-xl border-2 transition-colors duration-200",
          scanSuccess ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-primary"
        )}>
          <div id={containerRef.current} className="w-full" />
          <button
            onClick={stopScanning}
            className="absolute top-3 right-3 bg-background/80 hover:bg-background text-foreground p-2 rounded-full backdrop-blur-sm z-50 border border-border/50"
          >
            <XCircle className="w-5 h-5" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/80 to-transparent p-3 pointer-events-none">
            <p className="text-xs text-center text-muted-foreground">
              Point camera at any barcode or QR code
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
