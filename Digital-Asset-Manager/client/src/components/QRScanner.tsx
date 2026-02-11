import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Scan, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  className?: string;
}

export function QRScanner({ onScan, className }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const startScanning = () => {
    setIsScanning(true);
    // Tiny delay to ensure DOM element exists
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );
      
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          // Vibration feedback
          if (navigator.vibrate) navigator.vibrate(200);
          onScan(decodedText);
          stopScanning();
        },
        (error) => {
          // Ignore frequent scan errors
        }
      );
    }, 100);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error).finally(() => {
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {!isScanning ? (
        <button
          onClick={startScanning}
          className="w-full h-48 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-primary/5 hover:border-primary transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Scan className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Click to Scan QR</p>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-xl border-2 border-primary bg-black">
          <div id="reader" className="w-full" />
          <button 
            onClick={stopScanning}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm z-50"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
