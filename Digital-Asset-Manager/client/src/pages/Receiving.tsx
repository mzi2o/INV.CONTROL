import { useState } from "react";
import { Layout } from "@/components/Layout";
import { QRScanner } from "@/components/QRScanner";
import { useProductBySku, useSearchProducts } from "@/hooks/use-inventory";
import { usePendingItemsBySku } from "@/hooks/use-orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Truck, AlertCircle, PackageCheck, Search, ShoppingCart, Clock, Package, CheckCircle2, CircleDot, User, Calendar, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Receiving() {
  const [scannedSku, setScannedSku] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [verifyQty, setVerifyQty] = useState<number>(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineItemId, setTimelineItemId] = useState<number | null>(null);
  const [receivedSuccess, setReceivedSuccess] = useState(false);

  const activeSku = scannedSku || (manualInput.length >= 3 ? manualInput : null);
  const { data: product } = useProductBySku(activeSku);
  const { data: searchResults } = useSearchProducts(manualInput);
  const { data: pendingItems } = usePendingItemsBySku(activeSku);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: timelineData } = useQuery({
    queryKey: ["/api/receiving/timeline", timelineItemId],
    enabled: !!timelineItemId,
  });
  const timeline = timelineData as any[] | undefined;

  const isExactMatch = !!product;
  const showFuzzyResults = !isExactMatch && manualInput.length >= 2 && searchResults && searchResults.length > 0;
  const pendingList = pendingItems as any[] | undefined;
  const hasMultipleOrders = (pendingList?.length || 0) > 1;

  const { mutate: receiveItem, isPending } = useMutation({
    mutationFn: async (data: { purchaseRequestItemId: number; receivedQty: number; receivedBy?: string }) => {
      const res = await apiRequest("POST", "/api/receiving", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/sku"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/timeline"] });
      setReceivedSuccess(true);
      toast({ title: "Items Received", description: "Stock levels have been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedItemId(null);
    setScannedSku(null);
    setManualInput("");
    setVerifyQty(0);
    setReceivedSuccess(false);
  };

  const handleScan = (qr: string) => {
    setReceivedSuccess(false);
    setScannedSku(qr);
    setManualInput("");
    toast({ title: "Barcode Scanned", description: `Code: ${qr}` });
  };

  const selectFuzzyResult = (sku: string) => {
    setReceivedSuccess(false);
    setManualInput(sku);
    setScannedSku(null);
  };

  const handleSelectOrder = (itemId: number) => {
    setSelectedItemId(itemId);
  };

  const handleViewTimeline = (itemId: number) => {
    setTimelineItemId(itemId);
    setShowTimeline(true);
  };

  const handleSubmit = () => {
    if (selectedItemId && verifyQty > 0) {
      receiveItem({ purchaseRequestItemId: selectedItemId, receivedQty: verifyQty });
    }
  };

  const selectedOrder = pendingList?.find(i => i.id === selectedItemId);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="p-3 bg-primary/10 rounded-md text-primary">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-receiving-title">Receive Items</h1>
            <p className="text-muted-foreground">Scan supplier barcode or search by name to receive.</p>
          </div>
        </div>

        {receivedSuccess && (
          <Card className="p-6 border-green-500/30 bg-green-500/5" data-testid="card-receive-success">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-500 text-lg">Items Received Successfully</p>
                <p className="text-muted-foreground text-sm">Stock levels have been updated. Status synced across the system.</p>
              </div>
              <Button variant="outline" onClick={resetForm} className="min-h-[48px]" data-testid="button-receive-another">
                Receive Another
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">1. Scan or Search</h3>
            <QRScanner onScan={handleScan} />

            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Or search by SKU, barcode, or name</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder='e.g. "6923172568571" or "Camera 2M"'
                  value={scannedSku || manualInput}
                  onChange={(e) => {
                    setScannedSku(null);
                    setManualInput(e.target.value);
                    setReceivedSuccess(false);
                  }}
                  className="font-mono pl-10 h-12"
                  data-testid="input-manual-sku"
                />
              </div>
            </div>

            {showFuzzyResults && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''} found:
                </p>
                {searchResults.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => selectFuzzyResult(r.sku)}
                    className="p-3 rounded-md bg-secondary/30 border border-border/30 cursor-pointer hover-elevate min-h-[48px] flex items-center gap-3"
                    data-testid={`search-result-${r.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{r.manufacturerItemName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.sku}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">Stock: {r.currentStock}</Badge>
                  </div>
                ))}
              </div>
            )}

            {isExactMatch && product && (
              <div className="mt-4 space-y-2 p-4 bg-secondary/30 rounded-md border border-border/30">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground uppercase">Product Match</span>
                  <Badge variant="secondary">
                    <PackageCheck className="w-3 h-3 mr-1" /> Found
                  </Badge>
                </div>
                <p className="font-medium">{product.manufacturerItemName}</p>
                {product.internalItemName && (
                  <p className="text-sm text-muted-foreground">{product.internalItemName}</p>
                )}
                <div className="flex justify-between text-sm flex-wrap gap-2">
                  <span className="text-muted-foreground">SKU</span>
                  <span className="font-mono">{product.sku}</span>
                </div>
                <div className="flex justify-between text-sm flex-wrap gap-2">
                  <span className="text-muted-foreground">Current Stock</span>
                  <span className="font-mono font-bold">{product.currentStock}</span>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">2. Match Pending Order</h3>

            {!activeSku ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 border-2 border-dashed border-border/50 rounded-md bg-secondary/10">
                <AlertCircle className="w-8 h-8 opacity-50" />
                <p className="text-sm">Scan or search for an item to find orders</p>
              </div>
            ) : !pendingList?.length ? (
              <div className="p-6 bg-accent/5 border border-accent/30 rounded-md text-center space-y-3">
                <ShoppingCart className="w-10 h-10 text-accent mx-auto" />
                <p className="font-medium">No pending orders for this item</p>
                <p className="text-sm text-muted-foreground">
                  You need to create a purchase request first before receiving items.
                </p>
                <Link href="/purchase">
                  <Button variant="outline" className="min-h-[48px] mt-2" data-testid="link-create-pr">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Create Purchase Request
                  </Button>
                </Link>
              </div>
            ) : hasMultipleOrders ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-primary" />
                    <p className="font-semibold text-primary">{pendingList.length} Pending Orders Found</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Multiple orders exist for this product. Select which order you are receiving.</p>
                </div>

                {selectedOrder ? (
                  <div className="space-y-3">
                    <OrderCard item={selectedOrder} isSelected onViewTimeline={() => handleViewTimeline(selectedOrder.id)} />
                    <Button variant="outline" onClick={() => { setSelectedItemId(null); }} className="w-full min-h-[48px]" data-testid="button-change-order">
                      Change Order Selection
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingList.map((item: any) => (
                      <OrderCard
                        key={item.id}
                        item={item}
                        isSelected={false}
                        onSelect={() => handleSelectOrder(item.id)}
                        onViewTimeline={() => handleViewTimeline(item.id)}
                        showSelectButton
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {pendingList.map((item: any) => (
                  <OrderCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItemId === item.id}
                    onSelect={() => setSelectedItemId(item.id)}
                    onViewTimeline={() => handleViewTimeline(item.id)}
                  />
                ))}
              </div>
            )}

            {selectedItemId && !receivedSuccess && (
              <div className="mt-8 pt-6 border-t border-border/50 animate-in slide-in-from-bottom-2">
                <h3 className="text-lg font-semibold mb-4">3. Verify Quantity</h3>
                {selectedOrder && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Expected: <span className="font-mono font-bold text-foreground">{selectedOrder.requestedQty}</span> units
                    {selectedOrder.receivedQty > 0 && (
                      <span> (already received: <span className="font-mono text-green-500">{selectedOrder.receivedQty}</span>)</span>
                    )}
                  </p>
                )}
                <div className="flex gap-4">
                  <Input
                    type="number"
                    placeholder="Enter verified qty"
                    className="text-lg font-mono h-12"
                    value={verifyQty || ""}
                    onChange={(e) => setVerifyQty(parseInt(e.target.value) || 0)}
                    data-testid="input-verify-qty"
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={isPending || verifyQty <= 0}
                    className="px-8 text-lg font-semibold min-h-[48px]"
                    data-testid="button-receive"
                  >
                    {isPending ? "Receiving..." : "Receive"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={showTimeline} onOpenChange={setShowTimeline}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Order Timeline
            </DialogTitle>
          </DialogHeader>
          {timeline && timeline.length > 0 ? (
            <div className="space-y-0 relative ml-4 mt-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
              {timeline.map((event: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 pb-6 relative" data-testid={`timeline-event-${idx}`}>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 shrink-0 z-10",
                    event.type === 'created' ? "bg-primary border-primary" :
                    event.type === 'received' ? "bg-green-500 border-green-500" :
                    event.type === 'completed' ? "bg-primary border-primary" :
                    "bg-muted border-border"
                  )} />
                  <div className="min-w-0 flex-1 -mt-0.5">
                    <p className="font-medium text-sm">{event.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
                    {event.quantity && (
                      <p className="text-xs text-muted-foreground">Qty: {event.quantity}</p>
                    )}
                    {event.isDamaged && (
                      <Badge variant="destructive" className="mt-1">Damaged</Badge>
                    )}
                    {event.date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(event.date), "MMM d, yyyy 'at' HH:mm")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No timeline data available</p>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function OrderCard({ item, isSelected, onSelect, onViewTimeline, showSelectButton }: {
  item: any;
  isSelected: boolean;
  onSelect?: () => void;
  onViewTimeline?: () => void;
  showSelectButton?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "p-4 rounded-md border transition-all",
        onSelect ? "cursor-pointer" : "",
        isSelected
          ? "bg-primary/10 border-primary"
          : "bg-secondary/20 border-border/50 hover-elevate"
      )}
      data-testid={`card-pending-item-${item.id}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{item.requestQr || `PRI #${item.id}`}</p>
            <Badge variant={item.status === 'Received' ? 'default' : 'secondary'} className="text-xs">
              {item.status}
            </Badge>
          </div>

          {item.productName && (
            <p className="text-sm text-muted-foreground mt-1 truncate">{item.productName}</p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
            {item.requestedBy && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">{item.requestedBy}</span>
              </div>
            )}
            {item.requestDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>{format(new Date(item.requestDate), "MMM d, yyyy")}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="w-3 h-3 shrink-0" />
              <span>Expected: <span className="font-mono font-bold text-foreground">{item.requestedQty}</span> units</span>
            </div>
            {item.supplierName && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="w-3 h-3 shrink-0" />
                <span className="truncate">{item.supplierName}</span>
              </div>
            )}
          </div>

          {item.receivedQty > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Received:</span>
                <span className="font-mono font-bold text-green-500">{item.receivedQty}/{item.requestedQty}</span>
              </div>
              <div className="w-full bg-secondary/50 rounded-full h-1.5 mt-1">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (item.receivedQty / item.requestedQty) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {isSelected && !showSelectButton && (
            <div className="bg-primary text-primary-foreground rounded-full p-1">
              <Check className="w-4 h-4" />
            </div>
          )}
          {showSelectButton && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
              className="min-h-[48px] min-w-[48px]"
              data-testid={`button-select-order-${item.id}`}
            >
              Select
            </Button>
          )}
          {onViewTimeline && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onViewTimeline(); }}
              data-testid={`button-timeline-${item.id}`}
            >
              <Clock className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
