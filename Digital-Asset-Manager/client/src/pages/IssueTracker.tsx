import { useState } from "react";
import { Layout } from "@/components/Layout";
import { QRScanner } from "@/components/QRScanner";
import { useIssueStock, useDepartments } from "@/hooks/use-transactions";
import { useProductBySku } from "@/hooks/use-inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, Building2, Zap, AlertTriangle, PackageCheck } from "lucide-react";

export default function IssueTracker() {
  const [scannedSku, setScannedSku] = useState<string>("");
  const [manualSku, setManualSku] = useState("");
  const [deptId, setDeptId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reasonCode, setReasonCode] = useState<string>("");
  const [mode, setMode] = useState<"IT" | "MAK">("IT");

  const activeSku = scannedSku || manualSku;
  const { data: product } = useProductBySku(activeSku || null);
  const { mutate: issueStock, isPending } = useIssueStock();
  const { data: allDepartments } = useDepartments();

  const departments = mode === "IT"
    ? allDepartments?.filter(d => !["Datos", "Cadenas"].includes(d.name)) || []
    : allDepartments?.filter(d => ["Datos", "Cadenas"].includes(d.name)) || [];

  const handleIssue = () => {
    if (!activeSku || !deptId || quantity <= 0) return;

    issueStock({
      sku: activeSku,
      deptId: parseInt(deptId),
      quantity,
      reasonCode: reasonCode || undefined,
    }, {
      onSuccess: () => {
        setScannedSku("");
        setManualSku("");
        setQuantity(1);
        setReasonCode("");
      }
    });
  };

  const handleScan = (code: string) => {
    setScannedSku(code);
    setManualSku("");
  };

  const isLowStock = product && product.currentStock <= product.minThreshold;
  const isOutOfStock = product && product.currentStock === 0;

  const reasonCodes = [
    "Regular Use",
    "Replacement",
    "New Installation",
    "Emergency",
    "Testing",
    "Other",
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-md">
              <ArrowUpRight className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-stockout-title">Stock Out</h1>
              <p className="text-muted-foreground">Process departmental distribution.</p>
            </div>
          </div>

          <div className="flex bg-secondary/50 p-1 rounded-md border border-border/50 gap-1">
            <Button
              variant={mode === "IT" ? "default" : "ghost"}
              onClick={() => { setMode("IT"); setDeptId(""); }}
              className="min-h-[48px]"
              data-testid="button-mode-it"
            >
              IT Stock
            </Button>
            <Button
              variant={mode === "MAK" ? "default" : "ghost"}
              onClick={() => { setMode("MAK"); setDeptId(""); }}
              className="min-h-[48px]"
              data-testid="button-mode-mak"
            >
              MAK Production
            </Button>
          </div>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Destination Department
            </label>
            <Select onValueChange={setDeptId} value={deptId}>
              <SelectTrigger className="h-12" data-testid="select-department">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" /> Scan Item or Enter SKU
            </label>
            {!activeSku ? (
              <>
                <QRScanner onScan={handleScan} className="border rounded-md" />
                <Input
                  placeholder="Or type SKU: e.g. TN-HP-414A"
                  value={manualSku}
                  onChange={(e) => setManualSku(e.target.value)}
                  className="font-mono mt-2 h-12"
                  data-testid="input-sku"
                />
              </>
            ) : (
              <div className="space-y-3 animate-in zoom-in-95">
                <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="flex-1">
                    <p className="text-xs text-primary/70 uppercase font-bold tracking-wider">Item Identified</p>
                    <p className="text-lg font-mono font-bold text-primary">{activeSku}</p>
                  </div>
                  <Button variant="ghost" onClick={() => { setScannedSku(""); setManualSku(""); }} data-testid="button-rescan">
                    Rescan
                  </Button>
                </div>

                {product && (
                  <div className="p-3 bg-secondary/30 rounded-md border border-border/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{product.manufacturerItemName}</span>
                      {isOutOfStock ? (
                        <Badge variant="destructive">OUT OF STOCK</Badge>
                      ) : isLowStock ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 mr-1" /> LOW
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <PackageCheck className="w-3 h-3 mr-1" /> In Stock
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Available</span>
                      <span className="font-mono font-bold">{product.currentStock}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeSku && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Reason Code</label>
                <Select onValueChange={setReasonCode} value={reasonCode}>
                  <SelectTrigger className="h-12" data-testid="select-reason">
                    <SelectValue placeholder="Select Reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonCodes.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Quantity to Issue</label>
                <Input
                  type="number"
                  min={1}
                  max={product?.currentStock ?? 999}
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  className="text-2xl font-mono text-center h-14"
                  data-testid="input-quantity"
                />
              </div>

              <Button
                onClick={handleIssue}
                disabled={isPending || !deptId || !!isOutOfStock}
                className="w-full text-lg font-bold"
                size="lg"
                data-testid="button-confirm-issue"
              >
                {isPending ? "Processing..." : "CONFIRM ISSUE"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
