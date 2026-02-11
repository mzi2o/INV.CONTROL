import { pgTable, text, serial, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const enterprises = pgTable("enterprises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), 
});

export const productionUnits = pgTable("production_units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), 
  enterpriseId: integer("enterprise_id").references(() => enterprises.id),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), 
  isITDepartment: boolean("is_it_department").default(false).notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(), 
  supplierBarcode: text("supplier_barcode"),
  manufacturerItemName: text("manufacturer_item_name").notNull(),
  internalItemName: text("internal_item_name"),
  category: text("category"), 
  currentStock: integer("current_stock").notNull().default(0),
  minThreshold: integer("min_threshold").notNull().default(10),
});

export const purchaseRequests = pgTable("purchase_requests", {
  id: serial("id").primaryKey(),
  requestQr: text("request_qr").notNull().unique(), 
  requestedBy: text("requested_by"), 
  requestDate: timestamp("request_date").defaultNow(),
  status: text("status").notNull().default("Pending"), 
  notes: text("notes"),
});

export const purchaseRequestItems = pgTable("purchase_request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => purchaseRequests.id),
  productId: integer("product_id").references(() => products.id),
  requestedQty: integer("requested_qty").notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  supplierName: text("supplier_name"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("Pending"), 
});

export const receivingTransactions = pgTable("receiving_transactions", {
  id: serial("id").primaryKey(),
  purchaseRequestItemId: integer("purchase_request_item_id").references(() => purchaseRequestItems.id),
  receivedQty: integer("received_qty").notNull(),
  receivedDate: timestamp("received_date").defaultNow(),
  receivedBy: text("received_by"),
  isDamaged: boolean("is_damaged").default(false),
  damageNotes: text("damage_notes"),
  photoUrl: text("photo_url"),
});

export const transactionHistory = pgTable("transaction_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  deptId: integer("dept_id").references(() => departments.id),
  userId: text("user_id"),
  quantity: integer("quantity").notNull(),
  transactionType: text("transaction_type").notNull(), 
  reasonCode: text("reason_code"),
  transDate: timestamp("trans_date").defaultNow(),
  referenceRequestId: integer("reference_request_id").references(() => purchaseRequests.id),
});

export const tonerConsumption = pgTable("toner_consumption", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  deptId: integer("dept_id").references(() => departments.id),
  quantity: integer("quantity").notNull(),
  consumptionDate: timestamp("consumption_date").defaultNow(),
  requestedBy: text("requested_by"),
  approvedBy: text("approved_by"),
  isFlagged: boolean("is_flagged").default(false),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("Admin"),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertPurchaseRequestSchema = createInsertSchema(purchaseRequests).omit({ id: true, requestDate: true, requestQr: true });
export const insertPurchaseRequestItemSchema = createInsertSchema(purchaseRequestItems).omit({ id: true });
export const insertReceivingTransactionSchema = createInsertSchema(receivingTransactions).omit({ id: true, receivedDate: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });

export type Product = typeof products.$inferSelect;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type PurchaseRequestItem = typeof purchaseRequestItems.$inferSelect;
export type ReceivingTransaction = typeof receivingTransactions.$inferSelect;
export type TransactionLog = typeof transactionHistory.$inferSelect;
export type User = typeof users.$inferSelect;

export type ConsumptionWarning = {
  isWarning: boolean;
  average: number;
  current: number;
  message?: string;
};
