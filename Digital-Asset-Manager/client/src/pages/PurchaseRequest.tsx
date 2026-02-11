import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProducts } from "@/hooks/use-inventory";
import { usePurchaseRequests, useCreatePurchaseRequest, usePurchaseRequestItems } from "@/hooks/use-orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Trash2, Search, Clock, CheckCircle2, AlertTriangle, XCircle, Package, User, CalendarDays, FileText, Hash } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Product, PurchaseRequest as PurchaseRequestType } from "@shared/schema";

interface RequestItem {
  productId: number;
  product: Product;
  requestedQty: number;
  supplierName: string;
}

export default function PurchaseRequest() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: requests, isLoading: requestsLoading } = usePurchaseRequests();
  const { mutate: createRequest, isPending } = useCreatePurchaseRequest();

  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestType | null>(null);

  const { data: requestItemsRaw, isLoading: itemsLoading } = usePurchaseRequestItems(selectedRequest?.id ?? null);
  const requestItems = requestItemsRaw as any[] | undefined;

  const filteredProducts = products?.filter(p =>
    p.manufacturerItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.internalItemName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8);

  const addItem = (product: Product) => {
    if (items.find(i => i.productId === product.id)) return;
    setItems([...items, {
      productId: product.id,
      product,
      requestedQty: 1,
      supplierName: "",
    }]);
    setSearchTerm("");
  };

  const removeItem = (productId: number) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  const updateItem = (productId: number, field: keyof RequestItem, value: any) => {
    setItems(items.map(i => i.productId === productId ? { ...i, [field]: value } : i));
  };

  const handleSubmit = () => {
    if (items.length === 0) return;
    createRequest({
      request: {
        requestedBy: requestedBy || undefined,
        notes: notes || undefined,
        status: "Pending",
      },
      items: items.map(i => ({
        productId: i.productId,
        requestedQty: i.requestedQty,
        supplierName: i.supplierName || undefined,
      })),
    }, {
      onSuccess: () => {
        setItems([]);
        setNotes("");
        setRequestedBy("");
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
      case 'Approved': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'Rejected': return 'bg-destructive/20 text-destructive';
      case 'Received': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-3.5 h-3.5" />;
      case 'Approved': case 'Received': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Rejected': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const totalItemsInRequest = requestItems?.length ?? 0;
  const pendingItems = requestItems?.filter((i: any) => i.status === 'Pending').length ?? 0;
  const receivedItems = requestItems?.filter((i: any) => i.status === 'Received').length ?? 0;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="p-3 bg-primary/10 rounded-md text-primary">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-purchase-title">Purchase Request</h1>
            <p className="text-muted-foreground">Create new IT equipment requests.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">New Request</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Requested By</label>
                  <Input
                    placeholder="Your name"
                    value={requestedBy}
                    onChange={e => setRequestedBy(e.target.value)}
                    data-testid="input-requested-by"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <Input
                    placeholder="Order notes (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    data-testid="input-notes"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Search className="w-4 h-4" /> Search Products
                </label>
                <Input
                  placeholder="Type product name or SKU..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  data-testid="input-product-search"
                />

                {searchTerm.length >= 2 && filteredProducts && filteredProducts.length > 0 && (
                  <div className="border border-border/50 rounded-md bg-card max-h-48 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => addItem(p)}
                        className="flex items-center justify-between p-3 cursor-pointer hover-elevate border-b border-border/20 last:border-0"
                        data-testid={`option-product-${p.id}`}
                      >
                        <div>
                          <p className="font-medium text-sm">{p.manufacturerItemName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.currentStock <= p.minThreshold && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                          <Badge variant="secondary">{p.currentStock} in stock</Badge>
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Order Items</h4>
                  {items.map(item => (
                    <div key={item.productId} className="flex items-center gap-4 p-3 bg-secondary/20 rounded-md border border-border/30" data-testid={`item-row-${item.productId}`}>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.manufacturerItemName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={item.requestedQty}
                        onChange={e => updateItem(item.productId, "requestedQty", parseInt(e.target.value) || 1)}
                        className="w-20 text-center font-mono"
                        data-testid={`input-qty-${item.productId}`}
                      />
                      <Input
                        placeholder="Supplier"
                        value={item.supplierName}
                        onChange={e => updateItem(item.productId, "supplierName", e.target.value)}
                        className="w-36"
                        data-testid={`input-supplier-${item.productId}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.productId)} data-testid={`button-remove-${item.productId}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    onClick={handleSubmit}
                    disabled={isPending || items.length === 0}
                    className="w-full font-bold"
                    size="lg"
                    data-testid="button-submit-request"
                  >
                    {isPending ? "Submitting..." : `Submit Request (${items.length} items)`}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2">Recent Requests</h3>
              <p className="text-xs text-muted-foreground mb-4">Click any request for full details</p>
              {requestsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 mb-3 rounded-md" />
                ))
              ) : !requests?.length ? (
                <p className="text-muted-foreground text-center py-4 text-sm">No requests yet</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {requests.slice(0, 10).map((req: any) => (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className="p-3 bg-secondary/20 rounded-md border border-border/30 cursor-pointer hover-elevate min-h-[56px]"
                      data-testid={`card-request-${req.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-sm font-bold text-primary">{req.requestQr}</span>
                        <Badge className={cn("text-xs", getStatusColor(req.status))}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(req.status)}
                            {req.status}
                          </span>
                        </Badge>
                      </div>
                      {req.requestedBy && (
                        <p className="text-xs text-muted-foreground">By: {req.requestedBy}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {req.requestDate ? format(new Date(req.requestDate), 'PP') : '--'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Request Details
            </DialogTitle>
            <DialogDescription>Full details and item breakdown for this purchase request</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Request ID
                  </p>
                  <p className="font-mono font-bold text-primary" data-testid="text-request-qr">
                    {selectedRequest.requestQr}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                  <Badge className={cn("text-sm", getStatusColor(selectedRequest.status))}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedRequest.status)}
                      {selectedRequest.status}
                    </span>
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Requested By
                  </p>
                  <p className="font-medium" data-testid="text-request-by">
                    {selectedRequest.requestedBy || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Date
                  </p>
                  <p className="font-medium" data-testid="text-request-date">
                    {selectedRequest.requestDate ? format(new Date(selectedRequest.requestDate), 'PPP p') : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Notes
                  </p>
                  <p className="text-sm bg-secondary/30 p-2 rounded-md" data-testid="text-request-notes">
                    {selectedRequest.notes}
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                    <Package className="w-3 h-3" /> Items ({totalItemsInRequest})
                  </p>
                  {totalItemsInRequest > 0 && (
                    <div className="flex items-center gap-2">
                      {receivedItems > 0 && (
                        <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">
                          {receivedItems} Received
                        </Badge>
                      )}
                      {pendingItems > 0 && (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                          {pendingItems} Pending
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {itemsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-md" />
                    ))}
                  </div>
                ) : !requestItems?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No items found</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {requestItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-md bg-secondary/20 border border-border/30"
                        data-testid={`row-request-item-${item.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{item.productName || 'Unknown Product'}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.productSku || '--'}</p>
                          </div>
                          <Badge className={cn("text-xs shrink-0", getStatusColor(item.status))}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(item.status)}
                              {item.status}
                            </span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-foreground">Qty:</span>
                            <span className="font-mono font-bold">{item.requestedQty}</span>
                          </span>
                          {item.supplierName && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium text-foreground">Supplier:</span>
                              {item.supplierName}
                            </span>
                          )}
                          {item.unitPrice && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium text-foreground">Price:</span>
                              ${Number(item.unitPrice).toFixed(2)}
                            </span>
                          )}
                          {item.currentStock !== null && item.currentStock !== undefined && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium text-foreground">In Stock:</span>
                              <span className={cn("font-mono", item.currentStock <= 0 ? "text-destructive" : "")}>{item.currentStock}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Request #{selectedRequest.id} | {selectedRequest.requestQr}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
