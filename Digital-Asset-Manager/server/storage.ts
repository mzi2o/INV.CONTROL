import { db } from "./db";
import {
  products, purchaseRequests, purchaseRequestItems, receivingTransactions, transactionHistory,
  enterprises, productionUnits, departments, tonerConsumption, users,
  type Product, type PurchaseRequest, type PurchaseRequestItem, type ReceivingTransaction,
  type ConsumptionWarning, type User
} from "@shared/schema";
import { eq, desc, and, gte, sql, ilike, or } from "drizzle-orm";

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(product: any): Promise<Product>;
  updateProduct(id: number, data: any): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  updateProductStock(id: number, quantityChange: number): Promise<void>;

  getDepartments(): Promise<any[]>;

  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
  updateLastLogin(id: number): Promise<void>;
  getUserRequests(userId: number): Promise<any[]>;

  getPurchaseRequests(): Promise<PurchaseRequest[]>;
  createPurchaseRequest(request: any, items: any[]): Promise<PurchaseRequest>;
  getPendingItemsBySku(sku: string): Promise<any[]>;
  getPurchaseRequestItems(requestId: number): Promise<PurchaseRequestItem[]>;

  updatePurchaseRequest(id: number, data: any): Promise<PurchaseRequest>;
  deletePurchaseRequest(id: number): Promise<void>;

  getReceivingTimeline(purchaseRequestItemId: number): Promise<any[]>;
  receiveItem(data: any): Promise<ReceivingTransaction>;

  issueStock(sku: string, deptId: number, quantity: number, reasonCode?: string, userId?: string): Promise<{ transaction: any; warning: ConsumptionWarning | null }>;

  getTransactions(): Promise<any[]>;
  getTransactionWithDetails(id: number): Promise<any>;
  getDashboardStats(): Promise<any>;
  getTonerUsage(): Promise<any[]>;
  dismissTonerAlert(id: number): Promise<void>;
  checkTonerAbuse(productId: number, deptId: number, newQuantity: number): Promise<ConsumptionWarning>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    if (product) return product;
    const [byBarcode] = await db.select().from(products).where(eq(products.supplierBarcode, sku));
    return byBarcode;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const pattern = `%${query}%`;
    return await db.select().from(products).where(
      or(
        ilike(products.sku, pattern),
        ilike(products.supplierBarcode, pattern),
        ilike(products.manufacturerItemName, pattern),
        ilike(products.internalItemName, pattern)
      )
    );
  }

  async createProduct(product: any): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, data: any): Promise<Product> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async updateProductStock(id: number, quantityChange: number): Promise<void> {
    await db.execute(sql`UPDATE products SET current_stock = current_stock + ${quantityChange} WHERE id = ${id}`);
  }

  async getDepartments(): Promise<any[]> {
    return await db.select().from(departments);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: any): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async updateLastLogin(id: number): Promise<void> {
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
  }

  async getUserRequests(userId: number): Promise<any[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];
    // Match requests where requestedBy contains the user's name
    const allRequests = await this.getPurchaseRequests();
    // Also get items for each request
    const results = [];
    for (const req of allRequests) {
      const items = await this.getPurchaseRequestItems(req.id);
      results.push({ ...req, items });
    }
    return results;
  }

  async getPurchaseRequests(): Promise<PurchaseRequest[]> {
    return await db.select().from(purchaseRequests).orderBy(desc(purchaseRequests.requestDate));
  }

  async createPurchaseRequest(request: any, items: any[]): Promise<PurchaseRequest> {
    return await db.transaction(async (tx) => {
      const [newRequest] = await tx.insert(purchaseRequests).values({
        ...request,
        requestQr: `TEMP_${Date.now()}`
      }).returning();

      const requestQr = `REQ_${newRequest.id}`;
      await tx.update(purchaseRequests).set({ requestQr }).where(eq(purchaseRequests.id, newRequest.id));

      for (const item of items) {
        await tx.insert(purchaseRequestItems).values({ ...item, requestId: newRequest.id });
      }

      return { ...newRequest, requestQr };
    });
  }

  async updatePurchaseRequest(id: number, data: any): Promise<PurchaseRequest> {
    const [updated] = await db.update(purchaseRequests).set(data).where(eq(purchaseRequests.id, id)).returning();
    return updated;
  }

  async deletePurchaseRequest(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, id));
      await tx.delete(purchaseRequests).where(eq(purchaseRequests.id, id));
    });
  }

  async getPendingItemsBySku(sku: string): Promise<any[]> {
    const product = await this.getProductBySku(sku);
    if (!product) return [];

    const items = await db.select({
      id: purchaseRequestItems.id,
      requestId: purchaseRequestItems.requestId,
      productId: purchaseRequestItems.productId,
      requestedQty: purchaseRequestItems.requestedQty,
      expectedDeliveryDate: purchaseRequestItems.expectedDeliveryDate,
      supplierName: purchaseRequestItems.supplierName,
      unitPrice: purchaseRequestItems.unitPrice,
      status: purchaseRequestItems.status,
      requestQr: purchaseRequests.requestQr,
      requestedBy: purchaseRequests.requestedBy,
      requestDate: purchaseRequests.requestDate,
      requestStatus: purchaseRequests.status,
      requestNotes: purchaseRequests.notes,
      productName: products.manufacturerItemName,
      productSku: products.sku,
    })
    .from(purchaseRequestItems)
    .leftJoin(purchaseRequests, eq(purchaseRequestItems.requestId, purchaseRequests.id))
    .leftJoin(products, eq(purchaseRequestItems.productId, products.id))
    .where(and(
      eq(purchaseRequestItems.productId, product.id),
      eq(purchaseRequestItems.status, 'Pending')
    ))
    .orderBy(desc(purchaseRequests.requestDate));

    const enrichedItems = await Promise.all(items.map(async (item) => {
      const received = await db.select({
        totalReceived: sql<number>`coalesce(sum(${receivingTransactions.receivedQty}), 0)`,
      })
      .from(receivingTransactions)
      .where(eq(receivingTransactions.purchaseRequestItemId, item.id));

      return {
        ...item,
        receivedQty: Number(received[0]?.totalReceived) || 0,
      };
    }));

    return enrichedItems;
  }

  async getPurchaseRequestItems(requestId: number): Promise<any[]> {
    const items = await db.select({
      id: purchaseRequestItems.id,
      requestId: purchaseRequestItems.requestId,
      productId: purchaseRequestItems.productId,
      requestedQty: purchaseRequestItems.requestedQty,
      expectedDeliveryDate: purchaseRequestItems.expectedDeliveryDate,
      supplierName: purchaseRequestItems.supplierName,
      unitPrice: purchaseRequestItems.unitPrice,
      status: purchaseRequestItems.status,
      productName: products.manufacturerItemName,
      productSku: products.sku,
      productCategory: products.category,
      currentStock: products.currentStock,
    })
    .from(purchaseRequestItems)
    .leftJoin(products, eq(purchaseRequestItems.productId, products.id))
    .where(eq(purchaseRequestItems.requestId, requestId));
    return items;
  }

  async getReceivingTimeline(purchaseRequestItemId: number): Promise<any[]> {
    const [item] = await db.select({
      id: purchaseRequestItems.id,
      requestId: purchaseRequestItems.requestId,
      status: purchaseRequestItems.status,
      requestedQty: purchaseRequestItems.requestedQty,
      requestQr: purchaseRequests.requestQr,
      requestedBy: purchaseRequests.requestedBy,
      requestDate: purchaseRequests.requestDate,
      requestStatus: purchaseRequests.status,
    })
    .from(purchaseRequestItems)
    .leftJoin(purchaseRequests, eq(purchaseRequestItems.requestId, purchaseRequests.id))
    .where(eq(purchaseRequestItems.id, purchaseRequestItemId));

    if (!item) return [];

    const receivings = await db.select()
      .from(receivingTransactions)
      .where(eq(receivingTransactions.purchaseRequestItemId, purchaseRequestItemId))
      .orderBy(desc(receivingTransactions.receivedDate));

    const timeline: any[] = [];

    timeline.push({
      type: 'created',
      label: 'Request Created',
      detail: `${item.requestQr} by ${item.requestedBy || 'System'}`,
      date: item.requestDate,
      quantity: item.requestedQty,
    });

    for (const r of receivings) {
      timeline.push({
        type: 'received',
        label: 'Items Received',
        detail: `${r.receivedQty} units received${r.receivedBy ? ` by ${r.receivedBy}` : ''}`,
        date: r.receivedDate,
        quantity: r.receivedQty,
        isDamaged: r.isDamaged,
        damageNotes: r.damageNotes,
      });
    }

    if (item.status === 'Received') {
      timeline.push({
        type: 'completed',
        label: 'Order Completed',
        detail: 'All items received and verified',
        date: receivings[0]?.receivedDate || new Date(),
      });
    }

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return timeline;
  }

  async receiveItem(data: any): Promise<ReceivingTransaction> {
    return await db.transaction(async (tx) => {
      const [receiving] = await tx.insert(receivingTransactions).values(data).returning();

      const [item] = await tx.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.id, data.purchaseRequestItemId));

      if (item.productId) {
        await tx.execute(sql`UPDATE products SET current_stock = current_stock + ${data.receivedQty} WHERE id = ${item.productId}`);
        await tx.insert(transactionHistory).values({
          productId: item.productId,
          quantity: data.receivedQty,
          transactionType: 'IN',
          referenceRequestId: item.requestId
        });
      }

      const totalReceivedResult = await tx.select({
        total: sql<number>`coalesce(sum(${receivingTransactions.receivedQty}), 0)`,
      })
      .from(receivingTransactions)
      .where(eq(receivingTransactions.purchaseRequestItemId, data.purchaseRequestItemId));
      const totalReceived = Number(totalReceivedResult[0]?.total) || 0;

      if (totalReceived >= item.requestedQty) {
        await tx.update(purchaseRequestItems).set({ status: 'Received' }).where(eq(purchaseRequestItems.id, data.purchaseRequestItemId));

        if (item.requestId) {
          const remainingPending = await tx.select({ count: sql<number>`count(*)` })
            .from(purchaseRequestItems)
            .where(and(
              eq(purchaseRequestItems.requestId, item.requestId),
              eq(purchaseRequestItems.status, 'Pending')
            ));
          const pendingCount = Number(remainingPending[0]?.count) || 0;
          if (pendingCount === 0) {
            await tx.update(purchaseRequests).set({ status: 'Received' }).where(eq(purchaseRequests.id, item.requestId));
          }
        }
      }

      return receiving;
    });
  }

  async issueStock(sku: string, deptId: number, quantity: number, reasonCode?: string, userId?: string): Promise<{ transaction: any; warning: ConsumptionWarning | null }> {
    const product = await this.getProductBySku(sku);
    if (!product) throw new Error("Product not found with SKU: " + sku);
    if (product.currentStock < quantity) throw new Error(`Insufficient stock. Available: ${product.currentStock}, Requested: ${quantity}`);

    const warning = await this.checkTonerAbuse(product.id, deptId, quantity);

    const transaction = await db.transaction(async (tx) => {
      await tx.execute(sql`UPDATE products SET current_stock = current_stock - ${quantity} WHERE id = ${product.id}`);

      const [txn] = await tx.insert(transactionHistory).values({
        productId: product.id,
        deptId,
        quantity,
        transactionType: 'OUT',
        reasonCode,
        userId,
      }).returning();

      const isToner = product.category && ['Toner', 'Ribbon', 'Rollos'].includes(product.category);
      if (isToner) {
        await tx.insert(tonerConsumption).values({
          productId: product.id,
          deptId,
          quantity,
          requestedBy: userId,
          isFlagged: warning.isWarning,
        });
      }

      return txn;
    });

    return { transaction, warning: warning.isWarning ? warning : null };
  }

  async getTransactions(): Promise<any[]> {
    const txns = await db.select({
      id: transactionHistory.id,
      productId: transactionHistory.productId,
      deptId: transactionHistory.deptId,
      userId: transactionHistory.userId,
      quantity: transactionHistory.quantity,
      transactionType: transactionHistory.transactionType,
      reasonCode: transactionHistory.reasonCode,
      transDate: transactionHistory.transDate,
      referenceRequestId: transactionHistory.referenceRequestId,
      productName: products.manufacturerItemName,
      productSku: products.sku,
      departmentName: departments.name,
    })
    .from(transactionHistory)
    .leftJoin(products, eq(transactionHistory.productId, products.id))
    .leftJoin(departments, eq(transactionHistory.deptId, departments.id))
    .orderBy(desc(transactionHistory.transDate));

    return txns;
  }

  async getTransactionWithDetails(id: number): Promise<any> {
    const [txn] = await db.select({
      id: transactionHistory.id,
      productId: transactionHistory.productId,
      deptId: transactionHistory.deptId,
      userId: transactionHistory.userId,
      quantity: transactionHistory.quantity,
      transactionType: transactionHistory.transactionType,
      reasonCode: transactionHistory.reasonCode,
      transDate: transactionHistory.transDate,
      referenceRequestId: transactionHistory.referenceRequestId,
      productName: products.manufacturerItemName,
      productSku: products.sku,
      productCategory: products.category,
      departmentName: departments.name,
    })
    .from(transactionHistory)
    .leftJoin(products, eq(transactionHistory.productId, products.id))
    .leftJoin(departments, eq(transactionHistory.deptId, departments.id))
    .where(eq(transactionHistory.id, id));

    return txn;
  }

  async getDashboardStats(): Promise<any> {
    const allProducts = await this.getProducts();
    const allTransactions = await this.getTransactions();

    const totalStock = allProducts.reduce((acc, p) => acc + p.currentStock, 0);
    const lowStockCount = allProducts.filter(p => p.currentStock <= p.minThreshold).length;
    const totalIssued = allTransactions.filter(t => t.transactionType === 'OUT').reduce((acc, t) => acc + t.quantity, 0);
    const totalReceived = allTransactions.filter(t => t.transactionType === 'IN').reduce((acc, t) => acc + t.quantity, 0);

    const flaggedConsumptions = await db.select().from(tonerConsumption).where(eq(tonerConsumption.isFlagged, true));

    return {
      totalStock,
      lowStockCount,
      totalIssued,
      totalReceived,
      totalProducts: allProducts.length,
      abuseAlerts: flaggedConsumptions.length,
    };
  }

  async getTonerUsage(): Promise<any[]> {
    const usage = await db.select({
      id: tonerConsumption.id,
      productId: tonerConsumption.productId,
      deptId: tonerConsumption.deptId,
      quantity: tonerConsumption.quantity,
      consumptionDate: tonerConsumption.consumptionDate,
      requestedBy: tonerConsumption.requestedBy,
      isFlagged: tonerConsumption.isFlagged,
      productName: products.manufacturerItemName,
      productSku: products.sku,
      productCategory: products.category,
      departmentName: departments.name,
    })
    .from(tonerConsumption)
    .leftJoin(products, eq(tonerConsumption.productId, products.id))
    .leftJoin(departments, eq(tonerConsumption.deptId, departments.id))
    .orderBy(desc(tonerConsumption.consumptionDate));

    return usage;
  }

  async dismissTonerAlert(id: number): Promise<void> {
    await db.update(tonerConsumption).set({ isFlagged: false }).where(eq(tonerConsumption.id, id));
  }

  async checkTonerAbuse(productId: number, deptId: number, newQuantity: number): Promise<ConsumptionWarning> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const result = await db.select({
      totalQty: sql<number>`coalesce(sum(${tonerConsumption.quantity}), 0)`,
      count: sql<number>`count(*)`
    })
    .from(tonerConsumption)
    .where(and(
      eq(tonerConsumption.productId, productId),
      eq(tonerConsumption.deptId, deptId),
      gte(tonerConsumption.consumptionDate, oneMonthAgo)
    ));

    const totalQty = Number(result[0]?.totalQty) || 0;
    const count = Number(result[0]?.count) || 0;
    const average = count > 0 ? totalQty / count : 0;
    const isWarning = count > 0 && newQuantity > (average * 1.2);

    return {
      isWarning,
      average: Math.round(average * 100) / 100,
      current: newQuantity,
      message: isWarning ? `${Math.round(((newQuantity - average) / average) * 100)}% above 1-month average` : undefined
    };
  }
}

export const storage = new DatabaseStorage();
