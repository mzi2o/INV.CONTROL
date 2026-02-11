import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { useTransactions, useDashboardStats, useTonerUsage, type TonerUsageRecord } from "@/hooks/use-transactions";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Boxes, Package, ArrowUpRight, AlertTriangle, ShieldAlert, Printer, Factory } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useMemo } from "react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: transactions, isLoading: txnLoading } = useTransactions();
  const { data: tonerUsage, isLoading: tonerLoading } = useTonerUsage();
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [analyticsMode, setAnalyticsMode] = useState<"IT" | "MAK">("IT");

  const chartData = transactions?.slice(0, 20).reverse().map((t: any) => ({
    date: t.transDate ? format(new Date(t.transDate), 'MM/dd') : '--',
    quantity: t.quantity,
    type: t.transactionType
  })) || [];

  const filteredTonerUsage = useMemo(() => {
    if (!tonerUsage) return [];
    return tonerUsage.filter((u: TonerUsageRecord) => {
      if (analyticsMode === "MAK") {
        return u.departmentName === "Datos" || u.departmentName === "Cadenas";
      }
      return u.departmentName !== "Datos" && u.departmentName !== "Cadenas";
    });
  }, [tonerUsage, analyticsMode]);

  const flaggedRecords = useMemo(() => {
    return filteredTonerUsage.filter(u => u.isFlagged);
  }, [filteredTonerUsage]);

  const monthlyConsumption = useMemo(() => {
    if (!filteredTonerUsage.length) return [];
    const byMonth: Record<string, { month: string; total: number; flagged: number }> = {};
    filteredTonerUsage.forEach(u => {
      const monthKey = u.consumptionDate
        ? format(new Date(u.consumptionDate), 'yyyy-MM')
        : 'Unknown';
      const monthLabel = u.consumptionDate
        ? format(new Date(u.consumptionDate), 'MMM yyyy')
        : 'Unknown';
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { month: monthLabel, total: 0, flagged: 0 };
      }
      byMonth[monthKey].total += u.quantity;
      if (u.isFlagged) byMonth[monthKey].flagged += u.quantity;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
      .slice(-6);
  }, [filteredTonerUsage]);

  const deptBreakdown = useMemo(() => {
    if (!filteredTonerUsage.length) return [];
    const byDept: Record<string, { dept: string; total: number; count: number }> = {};
    filteredTonerUsage.forEach(u => {
      const dept = u.departmentName || 'Unknown';
      if (!byDept[dept]) byDept[dept] = { dept, total: 0, count: 0 };
      byDept[dept].total += u.quantity;
      byDept[dept].count++;
    });
    return Object.values(byDept).sort((a, b) => b.total - a.total);
  }, [filteredTonerUsage]);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">Real-time overview of warehouse operations.</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-mono text-muted-foreground">{format(new Date(), 'PPP')}</p>
            <p className="text-xs text-primary/80">System Operational</p>
          </div>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Inventory"
              value={stats?.totalStock ?? 0}
              icon={Boxes}
              trend={`${stats?.totalProducts ?? 0} products tracked`}
              data-testid="card-total-inventory"
            />
            <StatsCard
              title="Items Issued"
              value={stats?.totalIssued ?? 0}
              icon={ArrowUpRight}
              status="default"
              data-testid="card-items-issued"
            />
            <StatsCard
              title="Items Received"
              value={stats?.totalReceived ?? 0}
              icon={Package}
              status="success"
              data-testid="card-items-received"
            />
            <StatsCard
              title="Low Stock Alerts"
              value={stats?.lowStockCount ?? 0}
              icon={AlertTriangle}
              status={(stats?.lowStockCount ?? 0) > 0 ? "danger" : "default"}
              data-testid="card-low-stock"
            />
          </div>
        )}

        {(stats?.abuseAlerts ?? 0) > 0 && (
          <Card className="p-4 border-destructive/50 bg-destructive/5">
            <div className="flex items-center gap-3 flex-wrap">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              <span className="font-medium text-destructive">
                {stats?.abuseAlerts} consumption abuse alert(s) require review
              </span>
              <Badge variant="destructive" data-testid="badge-abuse-alerts">Requires Review</Badge>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Transaction History</h3>
            <div className="h-[300px] w-full">
              {txnLoading ? (
                <Skeleton className="w-full h-full" />
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No transaction data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Area type="monotone" dataKey="quantity" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorQty)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
            <p className="text-xs text-muted-foreground mb-4">Click any activity for full details</p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {txnLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))
              ) : !transactions?.length ? (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              ) : (
                transactions.slice(0, 15).map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTxn(t)}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-secondary/30 border border-border/30 cursor-pointer hover-elevate min-h-[56px]"
                    data-testid={`row-transaction-${t.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        t.transactionType === 'IN' ? "bg-green-500" : "bg-amber-500"
                      )} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {t.productName || (t.transactionType === 'IN' ? 'Received Stock' : 'Issued Stock')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.departmentName && <span>{t.departmentName} &middot; </span>}
                          {t.transDate ? format(new Date(t.transDate), 'PP') : '--'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={t.transactionType === 'IN' ? 'default' : 'secondary'}
                        className={t.transactionType === 'IN' ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'}
                      >
                        {t.transactionType === 'IN' ? 'Received' : 'Issued'}
                      </Badge>
                      <span className="font-mono font-bold text-sm w-10 text-right">
                        {t.transactionType === 'IN' ? '+' : '-'}{t.quantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-md">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold" data-testid="text-toner-analytics-title">Consumable Analytics</h2>
                <p className="text-sm text-muted-foreground">Toner, ribbon & roller consumption tracking</p>
              </div>
            </div>
            <div className="flex bg-secondary/50 p-1 rounded-md border border-border/50 gap-1">
              <Button
                variant={analyticsMode === "IT" ? "default" : "ghost"}
                onClick={() => setAnalyticsMode("IT")}
                className="min-h-[48px]"
                data-testid="button-analytics-it"
              >
                <Printer className="w-4 h-4 mr-2" />
                IT Toner
              </Button>
              <Button
                variant={analyticsMode === "MAK" ? "default" : "ghost"}
                onClick={() => setAnalyticsMode("MAK")}
                className="min-h-[48px]"
                data-testid="button-analytics-mak"
              >
                <Factory className="w-4 h-4 mr-2" />
                MAK Production
              </Button>
            </div>
          </div>

          {flaggedRecords.length > 0 && (
            <Card className="p-4 border-destructive/50 bg-destructive/5" data-testid="card-abuse-alerts">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <ShieldAlert className="w-5 h-5 text-destructive" />
                <span className="font-semibold text-destructive">
                  {flaggedRecords.length} Abuse Alert{flaggedRecords.length !== 1 ? 's' : ''} ({analyticsMode})
                </span>
                <Badge variant="destructive" className="text-xs">Exceeds 1-Month Average by 20%+</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                These requests exceeded the 1-month rolling average consumption by more than 20% for the same product and department.
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {flaggedRecords.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-4 p-3 rounded-md bg-destructive/5 border border-destructive/20 min-h-[48px]" data-testid={`row-flagged-${r.id}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.productName}</p>
                        <p className="text-xs text-muted-foreground">{r.departmentName} &middot; {r.productSku}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-destructive">Qty: {r.quantity}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.consumptionDate ? format(new Date(r.consumptionDate), 'PP') : '--'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2">Monthly Consumption</h3>
              <p className="text-xs text-muted-foreground mb-6">{analyticsMode === "IT" ? "IT department" : "MAK (Datos/Cadenas)"} consumable usage</p>
              <div className="h-[280px] w-full">
                {tonerLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : monthlyConsumption.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No consumption data for {analyticsMode} mode
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyConsumption}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        formatter={(value: number, name: string) => [
                          value,
                          name === 'total' ? 'Total Used' : 'Flagged'
                        ]}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="total" />
                      <Bar dataKey="flagged" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="flagged" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2">Department Breakdown</h3>
              <p className="text-xs text-muted-foreground mb-6">Consumption by department ({analyticsMode})</p>
              {tonerLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : deptBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No department data for {analyticsMode}
                </div>
              ) : (
                <div className="space-y-3">
                  {deptBreakdown.map(d => {
                    const maxTotal = deptBreakdown[0]?.total || 1;
                    const pct = Math.round((d.total / maxTotal) * 100);
                    return (
                      <div key={d.dept} className="space-y-1" data-testid={`dept-breakdown-${d.dept}`}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium truncate">{d.dept}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-muted-foreground">{d.count} requests</span>
                            <span className="font-mono font-bold text-sm">{d.total}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Consumption History</h3>
            <p className="text-xs text-muted-foreground mb-4">{analyticsMode === "IT" ? "IT" : "MAK"} consumable dispensing records</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-toner-history">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Item</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">SKU</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Department</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">Qty</th>
                    <th className="text-center py-3 px-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tonerLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="py-3 px-3"><Skeleton className="h-8 w-full" /></td>
                      </tr>
                    ))
                  ) : filteredTonerUsage.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-12">
                        No consumption records for {analyticsMode} mode
                      </td>
                    </tr>
                  ) : (
                    filteredTonerUsage.slice(0, 25).map(r => (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b border-border/20 hover-elevate",
                          r.isFlagged && "bg-destructive/5"
                        )}
                        data-testid={`row-toner-${r.id}`}
                      >
                        <td className="py-3 px-3 whitespace-nowrap">
                          {r.consumptionDate ? format(new Date(r.consumptionDate), 'PP') : '--'}
                        </td>
                        <td className="py-3 px-3 font-medium truncate max-w-[180px]">{r.productName}</td>
                        <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{r.productSku}</td>
                        <td className="py-3 px-3">{r.departmentName}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold">{r.quantity}</td>
                        <td className="py-3 px-3 text-center">
                          {r.isFlagged ? (
                            <Badge variant="destructive" className="text-xs" data-testid={`badge-flagged-${r.id}`}>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Flagged
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Normal</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedTxn} onOpenChange={() => setSelectedTxn(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Full audit trail for this transaction</DialogDescription>
          </DialogHeader>
          {selectedTxn && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                  <Badge
                    className={selectedTxn.transactionType === 'IN' ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'}
                  >
                    {selectedTxn.transactionType === 'IN' ? 'Received' : 'Issued'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quantity</p>
                  <p className="font-mono font-bold text-lg" data-testid="text-detail-quantity">
                    {selectedTxn.transactionType === 'IN' ? '+' : '-'}{selectedTxn.quantity}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Item</p>
                <p className="font-medium" data-testid="text-detail-item">
                  {selectedTxn.productName || 'N/A'}
                </p>
                {selectedTxn.productSku && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedTxn.productSku}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Department</p>
                <p className="font-medium" data-testid="text-detail-department">
                  {selectedTxn.departmentName || 'N/A'}
                </p>
              </div>

              {selectedTxn.reasonCode && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reason</p>
                  <p className="font-medium" data-testid="text-detail-reason">{selectedTxn.reasonCode}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Date & Time</p>
                <p className="font-medium" data-testid="text-detail-date">
                  {selectedTxn.transDate ? format(new Date(selectedTxn.transDate), 'PPP p') : 'N/A'}
                </p>
              </div>

              {selectedTxn.userId && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">User</p>
                  <p className="font-medium">{selectedTxn.userId}</p>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Transaction ID: #{selectedTxn.id}
                  {selectedTxn.referenceRequestId && ` | Request Ref: #${selectedTxn.referenceRequestId}`}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
