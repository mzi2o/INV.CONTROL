import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TransactionLog } from "@shared/schema";

export function useTransactions() {
  return useQuery<TransactionLog[]>({
    queryKey: ["/api/transactions"],
  });
}

export function useDashboardStats() {
  return useQuery<{
    totalStock: number;
    lowStockCount: number;
    totalIssued: number;
    totalReceived: number;
    totalProducts: number;
    abuseAlerts: number;
  }>({
    queryKey: ["/api/analytics/dashboard"],
  });
}

export function useIssueStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { sku: string; deptId: number; quantity: number; reasonCode?: string; userId?: string }) => {
      const res = await apiRequest("POST", "/api/stock-out", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });

      if (data.warning) {
        toast({
          title: "High Consumption Warning",
          description: data.warning.message || `Average: ${data.warning.average}, Current: ${data.warning.current}`,
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Item Issued",
          description: "Inventory has been deducted.",
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useDepartments() {
  return useQuery<{ id: number; name: string; isITDepartment: boolean }[]>({
    queryKey: ["/api/departments"],
  });
}

export function useDismissTonerAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/analytics/toner-alert/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/toner-usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({ title: "Alert Dismissed", description: "The abuse alert has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export type TonerUsageRecord = {
  id: number;
  productId: number;
  deptId: number;
  quantity: number;
  consumptionDate: string;
  requestedBy: string | null;
  isFlagged: boolean;
  productName: string | null;
  productSku: string | null;
  productCategory: string | null;
  departmentName: string | null;
};

export function useTonerUsage() {
  return useQuery<TonerUsageRecord[]>({
    queryKey: ["/api/analytics/toner-usage"],
  });
}
