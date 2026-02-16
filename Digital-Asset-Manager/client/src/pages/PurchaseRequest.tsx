import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useProducts } from "@/hooks/use-inventory";
import {
  usePurchaseRequests,
  useCreatePurchaseRequest,
  usePurchaseRequestItems,
  useUpdatePurchaseRequest,
  useDeletePurchaseRequest,
} from "@/hooks/use-orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  User,
  CalendarDays,
  FileText,
  Hash,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  const { mutate: updateRequest } = useUpdatePurchaseRequest();
  const { mutate: deleteRequest } = useDeletePurchaseRequest();

  const [searchTerm, setSearchTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestType | null>(null);

  // Dashboard filters
  const [dashSearch, setDashSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Edit state
  const [editRequest, setEditRequest] = useState<PurchaseRequestType | null>(null);
  const [editBy, setEditBy] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: requestItemsRaw, isLoading: itemsLoading } = usePurchaseRequestItems(
    selectedRequest?.id ?? null
  );
  const requestItems = requestItemsRaw as any[] | undefined;

  // Recent 5 requests
  const recentRequests = useMemo(() => {
    if (!requests) return [];
    return requests.slice(0, 5);
  }, [requests]);

  // Filtered requests for dashboard
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r) => {
      const matchesSearch =
        !dashSearch ||
        r.requestQr.toLowerCase().includes(dashSearch.toLowerCase()) ||
        (r.requestedBy?.toLowerCase().includes(dashSearch.toLowerCase())) ||
        (r.notes?.toLowerCase().includes(dashSearch.toLowerCase()));
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, dashSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filteredProducts = products
    ?.filter(
      (p) =>
        p.manufacturerItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.internalItemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 8);

  const addItem = (product: Product) => {
    if (items.find((i) => i.productId === product.id)) return;
    setItems([
      ...items,
      { productId: product.id, product, requestedQty: 1, supplierName: "" },
    ]);
    setSearchTerm("");
  };

  const removeItem = (productId: number) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const updateItem = (productId: number, field: keyof RequestItem, value: any) => {
    setItems(items.map((i) => (i.productId === productId ? { ...i, [field]: value } : i)));
  };

  const handleSubmit = () => {
    if (items.length === 0) return;
    createRequest(
      {
        request: {
          requestedBy: requestedBy || undefined,
          notes: notes || undefined,
          status: "Pending",
        },
        items: items.map((i) => ({
          productId: i.productId,
          requestedQty: i.requestedQty,
          supplierName: i.supplierName || undefined,
        })),
      },
      {
        onSuccess: () => {
          setItems([]);
          setNotes("");
          setRequestedBy("");
        },
      }
    );
  };

  const handleEdit = (req: PurchaseRequestType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditRequest(req);
    setEditBy(req.requestedBy || "");
    setEditNotes(req.notes || "");
  };

  const handleSaveEdit = () => {
    if (!editRequest) return;
    updateRequest(
      { id: editRequest.id, data: { requestedBy: editBy, notes: editNotes } },
      { onSuccess: () => setEditRequest(null) }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    deleteRequest(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
      case "Approved":
        return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "Rejected":
        return "bg-destructive/20 text-destructive";
      case "Received":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="w-3.5 h-3.5" />;
      case "Approved":
      case "Received":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "Rejected":
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const totalItemsInRequest = requestItems?.length ?? 0;
  const pendingItems = requestItems?.filter((i: any) => i.status === "Pending").length ?? 0;
  const receivedItems = requestItems?.filter((i: any) => i.status === "Received").length ?? 0;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="p-3 bg-primary/10 rounded-md text-primary">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-purchase-title">
              Purchase Request
            </h1>
            <p className="text-muted-foreground">Create and manage IT equipment requests.</p>
          </div>
        </div>

        {/* New Request Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">New Request</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Requested By</label>
              <Input
                placeholder="Your name"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                data-testid="input-requested-by"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <Input
                placeholder="Order notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-product-search"
            />

            {searchTerm.length >= 2 && filteredProducts && filteredProducts.length > 0 && (
              <div className="border border-border/50 rounded-md bg-card max-h-48 overflow-y-auto">
                {filteredProducts.map((p) => (
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
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Order Items
              </h4>
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-4 p-3 bg-secondary/20 rounded-md border border-border/30"
                  data-testid={`item-row-${item.productId}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.manufacturerItemName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={item.requestedQty}
                    onChange={(e) =>
                      updateItem(item.productId, "requestedQty", parseInt(e.target.value) || 1)
                    }
                    className="w-20 text-center font-mono"
                    data-testid={`input-qty-${item.productId}`}
                  />
                  <Input
                    placeholder="Supplier"
                    value={item.supplierName}
                    onChange={(e) => updateItem(item.productId, "supplierName", e.target.value)}
                    className="w-36"
                    data-testid={`input-supplier-${item.productId}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.productId)}
                    data-testid={`button-remove-${item.productId}`}
                  >
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

        {/* Section A: Recent 5 Requests */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Requests</h2>
          {requestsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-md" />
              ))}
            </div>
          ) : !recentRequests.length ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-sm">No requests yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {recentRequests.map((req: any) => (
                <Card
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className="p-4 cursor-pointer hover-elevate border border-border/50"
                  data-testid={`card-recent-${req.id}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-primary truncate">
                      {req.requestQr}
                    </span>
                  </div>
                  <Badge className={cn("text-xs mb-2", getStatusColor(req.status))}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(req.status)}
                      {req.status}
                    </span>
                  </Badge>
                  {req.requestedBy && (
                    <p className="text-xs text-muted-foreground truncate">{req.requestedBy}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {req.requestDate ? format(new Date(req.requestDate), "PP") : "--"}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section B: Full Requests Dashboard */}
        <Card className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <h2 className="text-lg font-semibold">All Requests</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={dashSearch}
                  onChange={(e) => {
                    setDashSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-56"
                  data-testid="input-dashboard-search"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-36" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-all-requests">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    Request ID
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                    Requested By
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Notes</th>
                  <th className="text-center py-3 px-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {requestsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="py-3 px-3">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                ) : paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-12">
                      No requests match your filters
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req: any) => (
                    <tr
                      key={req.id}
                      className="border-b border-border/20 hover-elevate cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                      data-testid={`row-request-${req.id}`}
                    >
                      <td className="py-3 px-3 font-mono text-xs font-bold text-primary">
                        {req.requestQr}
                      </td>
                      <td className="py-3 px-3">{req.requestedBy || "--"}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {req.requestDate ? format(new Date(req.requestDate), "PP") : "--"}
                      </td>
                      <td className="py-3 px-3 max-w-[200px] truncate text-muted-foreground">
                        {req.notes || "--"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge className={cn("text-xs", getStatusColor(req.status))}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(req.status)}
                            {req.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {req.status === "Pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => handleEdit(req, e)}
                                data-testid={`button-edit-${req.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(req.id);
                                }}
                                data-testid={`button-delete-${req.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-4">
              <p className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredRequests.length)} of{" "}
                {filteredRequests.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  data-testid="button-page-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setCurrentPage(page)}
                    data-testid={`button-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  data-testid="button-page-next"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Request Details
            </DialogTitle>
            <DialogDescription>
              Full details and item breakdown for this purchase request
            </DialogDescription>
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Status
                  </p>
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
                    {selectedRequest.requestedBy || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Date
                  </p>
                  <p className="font-medium" data-testid="text-request-date">
                    {selectedRequest.requestDate
                      ? format(new Date(selectedRequest.requestDate), "PPP p")
                      : "N/A"}
                  </p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Notes
                  </p>
                  <p
                    className="text-sm bg-secondary/30 p-2 rounded-md"
                    data-testid="text-request-notes"
                  >
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
                            <p className="font-medium text-sm truncate">
                              {item.productName || "Unknown Product"}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.productSku || "--"}
                            </p>
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
                              <span className="font-medium text-foreground">Price:</span>$
                              {Number(item.unitPrice).toFixed(2)}
                            </span>
                          )}
                          {item.currentStock !== null && item.currentStock !== undefined && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium text-foreground">In Stock:</span>
                              <span
                                className={cn(
                                  "font-mono",
                                  item.currentStock <= 0 ? "text-destructive" : ""
                                )}
                              >
                                {item.currentStock}
                              </span>
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

      {/* Edit Dialog */}
      <Dialog open={!!editRequest} onOpenChange={() => setEditRequest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Request</DialogTitle>
            <DialogDescription>
              Update details for {editRequest?.requestQr}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Requested By</label>
              <Input value={editBy} onChange={(e) => setEditBy(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditRequest(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this purchase request? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
