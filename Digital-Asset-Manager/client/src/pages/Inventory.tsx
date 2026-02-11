import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Boxes, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type Product } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

type CreateProductForm = z.infer<typeof insertProductSchema>;

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: products, isLoading } = useProducts();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const filteredProducts = products?.filter(p => {
    const matchesSearch =
      p.manufacturerItemName.toLowerCase().includes(search.toLowerCase()) ||
      (p.internalItemName?.toLowerCase().includes(search.toLowerCase())) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products?.map(p => p.category).filter(Boolean) || []));

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-md">
              <Boxes className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-inventory-title">Inventory</h1>
              <p className="text-muted-foreground">Manage products and stock levels.</p>
            </div>
          </div>
          <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search by Name or SKU..."
              className="pl-10 h-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Select onValueChange={setCategoryFilter} value={categoryFilter}>
            <SelectTrigger className="w-[180px] h-12" data-testid="select-category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c!} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products found.</TableCell>
                </TableRow>
              ) : (
                filteredProducts?.map((product) => {
                  const isOut = product.currentStock === 0;
                  const isLow = product.currentStock <= product.minThreshold;
                  return (
                    <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                      <TableCell className="font-mono text-primary/80">{product.sku}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.manufacturerItemName}</p>
                          {product.internalItemName && (
                            <p className="text-xs text-muted-foreground">{product.internalItemName}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category && (
                          <Badge variant="secondary">{product.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg font-bold">
                        <span className="flex items-center justify-end gap-1">
                          {isLow && !isOut && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          {product.currentStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{product.minThreshold}</TableCell>
                      <TableCell className="text-center">
                        {isOut ? (
                          <Badge variant="destructive">OUT</Badge>
                        ) : isLow ? (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/30">LOW</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/30">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditProduct(product)}
                            className="text-accent min-h-[40px] min-w-[40px]"
                            data-testid={`button-edit-${product.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteProduct(product)}
                            className="text-destructive min-h-[40px] min-w-[40px]"
                            data-testid={`button-delete-${product.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <EditProductDialog product={editProduct} onClose={() => setEditProduct(null)} />
      <DeleteProductDialog product={deleteProduct} onClose={() => setDeleteProduct(null)} />
    </Layout>
  );
}

function EditProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { mutate: updateProduct, isPending } = useUpdateProduct();
  const [stock, setStock] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [category, setCategory] = useState("");
  const [supplierBarcode, setSupplierBarcode] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  if (product && stock === 0 && threshold === 0 && category === "") {
    setTimeout(() => {
      setStock(product.currentStock);
      setThreshold(product.minThreshold);
      setCategory(product.category || "");
      setSupplierBarcode(product.supplierBarcode || "");
    }, 0);
  }

  const handleSave = () => {
    if (!product) return;
    updateProduct(
      { id: product.id, data: { currentStock: stock, minThreshold: threshold, category, supplierBarcode: supplierBarcode || undefined } },
      {
        onSuccess: () => {
          onClose();
          setStock(0);
          setThreshold(0);
          setCategory("");
          setSupplierBarcode("");
        },
      }
    );
  };

  return (
    <Dialog open={!!product} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update stock levels, threshold, or category</DialogDescription>
        </DialogHeader>
        {product && (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium">{product.manufacturerItemName}</p>
              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Stock</label>
              <Input
                type="number"
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                className="h-12"
                data-testid="input-edit-stock"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Threshold</label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                className="h-12"
                data-testid="input-edit-threshold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier Barcode</label>
              <Input
                placeholder="Physical box barcode (optional)"
                value={supplierBarcode}
                onChange={(e) => setSupplierBarcode(e.target.value)}
                className="h-12 font-mono"
                data-testid="input-edit-barcode"
              />
              <p className="text-xs text-muted-foreground">The barcode printed on the supplier's packaging</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger className="h-12" data-testid="select-edit-category">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Toner">Toner</SelectItem>
                  <SelectItem value="Ribbon">Ribbon</SelectItem>
                  <SelectItem value="Rollos">Rollos</SelectItem>
                  <SelectItem value="IT Equipment">IT Equipment</SelectItem>
                  <SelectItem value="Network">Network</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSave}
              className="w-full h-12"
              disabled={isPending}
              data-testid="button-save-edit"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { mutate: deleteProduct, isPending } = useDeleteProduct();

  const handleDelete = () => {
    if (!product) return;
    deleteProduct(product.id, { onSuccess: onClose });
  };

  return (
    <AlertDialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{product?.manufacturerItemName}</strong> ({product?.sku})?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12" data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground h-12"
            data-testid="button-confirm-delete"
          >
            {isPending ? "Deleting..." : "Delete Product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate: createProduct, isPending } = useCreateProduct();
  const form = useForm<CreateProductForm>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      sku: "",
      manufacturerItemName: "",
      internalItemName: "",
      category: "IT Equipment",
      currentStock: 0,
      minThreshold: 5,
    },
  });

  const onSubmit = (data: CreateProductForm) => {
    createProduct(data as any, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-12" data-testid="button-add-product">
          <Plus className="w-5 h-5 mr-2" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Create a new product in your inventory</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU Code</FormLabel>
                  <FormControl><Input {...field} placeholder="TN-HP-414A" className="h-12" data-testid="input-sku" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="manufacturerItemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacturer Item Name</FormLabel>
                  <FormControl><Input {...field} placeholder="HP 414A Black Toner" className="h-12" data-testid="input-mfr-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="internalItemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Name (optional)</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} placeholder="Toner Noir HP" className="h-12" data-testid="input-internal-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="h-12" data-testid="select-category">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Toner">Toner</SelectItem>
                        <SelectItem value="Ribbon">Ribbon</SelectItem>
                        <SelectItem value="Rollos">Rollos</SelectItem>
                        <SelectItem value="IT Equipment">IT Equipment</SelectItem>
                        <SelectItem value="Network">Network</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Stock</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-12" onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-stock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="minThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Threshold</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="h-12" onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-threshold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12" disabled={isPending} data-testid="button-create-product">
              {isPending ? "Creating..." : "Create Product"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
