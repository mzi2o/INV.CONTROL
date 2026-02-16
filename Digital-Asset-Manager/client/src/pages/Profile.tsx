import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useCurrentUser } from "@/hooks/use-auth";
import { usePurchaseRequests } from "@/hooks/use-orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Lock,
  FileDown,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from "jspdf";

type AuthUser = { id: number; name: string; email: string; role: string };

export default function Profile() {
  const { data: user } = useCurrentUser() as { data: AuthUser | undefined };
  const { data: requests } = usePurchaseRequests();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password Changed", description: "Your password has been updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r) => {
      return statusFilter === "All" || r.status === statusFilter;
    });
  }, [requests, statusFilter]);

  const pendingRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r) => r.status === "Pending");
  }, [requests]);

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const passwordChecks = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      symbol: /[^A-Za-z0-9]/.test(newPassword),
    };
  }, [newPassword]);

  const allChecksPassed =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.number &&
    passwordChecks.symbol &&
    newPassword === confirmPassword &&
    currentPassword.length > 0;

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

  const handleExportPDF = () => {
    if (!pendingRequests.length) {
      toast({
        title: "No Pending Requests",
        description: "There are no pending requests to export.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Company header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("TINTCOLOR2010", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Zone Industrielle Gzenaya Lot 261, 262, 263 et 266 Tanger | +212 539 934 409",
      pageWidth / 2,
      28,
      { align: "center" }
    );

    doc.setDrawColor(79, 99, 61); // olive green
    doc.setLineWidth(0.5);
    doc.line(14, 33, pageWidth - 14, 33);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Pending Purchase Requests", pageWidth / 2, 42, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "PPP")}`, pageWidth / 2, 49, { align: "center" });

    // Table header
    let y = 58;
    const colX = [14, 70, 110, 140, 175];
    const headers = ["Item Name / SKU", "Quantity", "Date", "Requested By", "Status"];

    doc.setFillColor(79, 99, 61);
    doc.rect(14, y - 5, pageWidth - 28, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => {
      doc.text(h, colX[i], y);
    });

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 10;

    pendingRequests.forEach((req) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(8);
      doc.text(req.requestQr || "--", colX[0], y);
      doc.text("--", colX[1], y);
      doc.text(req.requestDate ? format(new Date(req.requestDate), "PP") : "--", colX[2], y);
      doc.text(req.requestedBy || "--", colX[3], y);
      doc.text(req.status, colX[4], y);

      y += 7;
    });

    // Footer
    y = Math.max(y + 10, 260);
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(79, 99, 61);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Prepared for: Manar technologie", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(format(new Date(), "PPP"), pageWidth - 14, y, { align: "right" });

    const dateStr = format(new Date(), "yyyy-MM-dd");
    doc.save(`TINTCOLOR2010_Pending_Requests_${dateStr}.pdf`);

    toast({ title: "PDF Exported", description: "The pending requests PDF has been downloaded." });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="p-3 bg-primary/10 rounded-md text-primary">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">
              {user?.name} - {user?.email}
            </p>
          </div>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="requests" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              My Requests
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-6 mt-6">
            {/* Filter and Export Row */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-profile-status">
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

              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="gap-2"
                data-testid="button-export-pdf"
              >
                <FileDown className="w-4 h-4" />
                Export Pending to PDF (Manar technologie)
              </Button>
            </div>

            {/* Requests Table */}
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-my-requests">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Request ID
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Requested By
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted-foreground py-12">
                          No requests found
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req: any) => (
                        <tr
                          key={req.id}
                          className="border-b border-border/20 hover-elevate"
                          data-testid={`row-profile-request-${req.id}`}
                        >
                          <td className="py-3 px-4 font-mono text-xs font-bold text-primary">
                            {req.requestQr}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {req.requestDate
                              ? format(new Date(req.requestDate), "PP")
                              : "--"}
                          </td>
                          <td className="py-3 px-4">{req.requestedBy || "--"}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={cn("text-xs", getStatusColor(req.status))}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(req.status)}
                                {req.status}
                              </span>
                            </Badge>
                          </td>
                          <td className="py-3 px-4 max-w-[200px] truncate text-muted-foreground">
                            {req.notes || "--"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-6">
            <Card className="p-6 max-w-md">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Change Password</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      data-testid="input-current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    data-testid="input-confirm-password"
                  />
                </div>

                {/* Password requirements */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5 p-3 bg-secondary/30 rounded-md border border-border/30">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Password Requirements
                    </p>
                    <PasswordCheck label="At least 8 characters" met={passwordChecks.length} />
                    <PasswordCheck
                      label="One uppercase letter"
                      met={passwordChecks.uppercase}
                    />
                    <PasswordCheck label="One number" met={passwordChecks.number} />
                    <PasswordCheck
                      label="One special character"
                      met={passwordChecks.symbol}
                    />
                    {confirmPassword.length > 0 && (
                      <PasswordCheck
                        label="Passwords match"
                        met={newPassword === confirmPassword}
                      />
                    )}
                  </div>
                )}

                <Button
                  onClick={handleChangePassword}
                  disabled={!allChecksPassed || changePasswordMutation.isPending}
                  className="w-full"
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      )}
      <span className={met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}
