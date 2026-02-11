import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseRequest } from "@shared/schema";

export function usePurchaseRequests() {
  return useQuery<PurchaseRequest[]>({
    queryKey: ["/api/purchase-requests"],
  });
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { request: any; items: any[] }) => {
      const res = await apiRequest("POST", "/api/purchase-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      toast({ title: "Purchase Request Created", description: "Your request has been submitted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function usePurchaseRequestItems(requestId: number | null) {
  return useQuery({
    queryKey: ["/api/purchase-requests", requestId, "items"],
    enabled: !!requestId,
  });
}

export function usePendingItemsBySku(sku: string | null) {
  return useQuery({
    queryKey: ["/api/purchase-requests/pending", sku],
    queryFn: async () => {
      if (!sku) return [];
      const res = await fetch(`/api/purchase-requests/pending/${encodeURIComponent(sku)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pending items");
      return res.json();
    },
    enabled: !!sku,
  });
}
