## Overview

This is an **Inventory Management System** (INV.CONTROL) designed for warehouse operations, supporting two divisions: General IT Stock and MAK Production Stock. The system prioritizes QR code scanning for speed and detailed transaction logging for audit purposes. Key features include a receiving dock for inbound QR scanning, a toner/ribbon issue tracker for outbound dispensing, an analytics dashboard with consumption warnings and toner abuse detection, full inventory management with edit/delete and audit trail, purchase request management, and session-based authentication with 5 admin users.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Dark industrial theme as default, Sunlight Mode as alternate
- Glove-mode UX: 48px minimum touch targets on all interactive elements
- Amber (#ffb700) accent colors

## Authentication

- Session-based auth using express-session + connect-pg-simple
- 5 admin users seeded on startup (all share password "Admin@2026!")
- Users: Marwa Mazini, Benamti Otman, Akhazzan Mossaab, Xevi, Zineb Aktaou
- All API routes protected with `requireAuth` middleware
- Login redirects handled client-side via `use-auth.ts` hook

## System Architecture

### Frontend
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter with 5 main pages: Dashboard, Purchase Request, Receiving, Issue Tracker (Stock Out), and Inventory
- **State Management**: TanStack React Query for server state, with custom hooks (`use-inventory.ts`, `use-auth.ts`, `use-transactions.ts`)
- **UI Components**: Shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Dark industrial theme (#1a1a1a background, #ffb700 amber accents) as default, Sunlight Mode as alternate
- **Charts**: Recharts (AreaChart for transactions, BarChart for monthly consumption)
- **QR Scanning**: html5-qrcode library with vibration feedback on successful scan
- **Forms**: React Hook Form with Zod resolvers for validation
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Theme**: ThemeProvider with dark/light toggle, localStorage persistence

### Backend
- **Framework**: Express 5 on Node.js with TypeScript (compiled via tsx in dev, esbuild for production)
- **API Design**: REST API with routes defined in `shared/routes.ts` with Zod schemas for input validation
- **API Prefix**: All endpoints under `/api/` (auth, products, departments, purchase-requests, receiving, stock-out, transactions, analytics)
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Connection**: node-postgres (pg) Pool, configured via `DATABASE_URL`
- **Storage Pattern**: Interface-based storage (`IStorage`) implemented by `DatabaseStorage` class
- **Session**: express-session with connect-pg-simple for PostgreSQL session store

### Shared Layer (`shared/`)
- **Schema** (`shared/schema.ts`): Drizzle table definitions for products, purchase_requests, purchase_request_items, receiving_transactions, transaction_history, toner_consumption, departments, enterprises, production_units, users
- **Routes** (`shared/routes.ts`): Centralized API route definitions with paths, methods, input schemas
- Key types: `Product`, `PurchaseRequest`, `PurchaseRequestItem`, `ReceivingTransaction`, `TransactionLog`, `ConsumptionWarning`, `User`

### Database Schema (PostgreSQL)
- **products**: id, sku (unique), manufacturer_item_name, internal_item_name, category, current_stock, min_threshold
- **purchase_requests**: id, request_qr (unique), requested_by, request_date, status, notes
- **purchase_request_items**: id, request_id, product_id, requested_qty, expected_delivery_date, supplier_name, unit_price, status
- **receiving_transactions**: id, purchase_request_item_id, received_qty, received_date, received_by, is_damaged, damage_notes, photo_url
- **transaction_history**: id, product_id, dept_id, user_id, quantity, transaction_type (IN/OUT), reason_code, trans_date, reference_request_id
- **toner_consumption**: id, product_id, dept_id, quantity, consumption_date, requested_by, approved_by, is_flagged
- **departments**: id, name, is_it_department
- **users**: id, name, email, password_hash, role, is_active, last_login, created_at
- Schema migrations managed via `drizzle-kit push` (`npm run db:push`)

### Key Business Logic
- **Toner Abuse Detection**: 1-month rolling average consumption check per department — flags warnings when new requests exceed +20% above average
- **Atomic Stock Updates**: Transactions use atomic SQL operations for stock adjustments
- **Stock Status**: Color-coded (Green = In Stock, Yellow = Low Stock, Red = Out of Stock) based on `minThreshold`
- **MAK Mode**: Restricted destinations to 'Cadenas' or 'Datos' for ribbon/roller items
- **IT Mode**: All departments except Datos/Cadenas
- **Consumable Tracking**: Toner, Ribbon, Rollos categories tracked in toner_consumption table

### Build & Development
- **Dev**: `npm run dev` runs tsx with NODE_ENV=development, Vite dev server with HMR
- **Build**: Custom build script (`script/build.ts`) that runs Vite build for client and esbuild for server, outputting to `dist/`
- **Production**: `npm start` serves the built application from `dist/`
- **Type checking**: `npm run check` runs tsc with noEmit

## Recent Changes

- **Feb 2026**: Added toner/consumable analytics section to Dashboard with IT/MAK toggle, monthly consumption bar chart, department breakdown, and consumption history table with abuse flagging
- **Feb 2026**: Implemented session-based authentication with 5 admin users, login/logout, and route protection
- **Feb 2026**: Added dark mode as default with amber accents; Sunlight Mode as alternate theme
- **Feb 2026**: Enhanced Receiving page with fuzzy product name search, supplier barcode support, inline multiple order selection with rich details (progress bars, requestor info), order timeline visualization, and partial receipt tracking
- **Feb 2026**: Added Inventory edit/delete with confirmation dialogs
- **Feb 2026**: Added Purchase Request page for multi-item orders
- **Feb 2026**: Dashboard transaction detail dialog with full audit trail

## External Dependencies

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable (required)
- **Drizzle ORM** for query building and schema management
- **connect-pg-simple** for session storage in PostgreSQL

### Key NPM Packages
- **bcryptjs**: Password hashing for authentication
- **express-session**: Session management
- **html5-qrcode**: QR code scanning via device camera
- **recharts**: Data visualization for analytics dashboard
- **date-fns**: Date formatting throughout the application
- **zod**: Schema validation shared between client and server
- **wouter**: Lightweight client-side routing
- **react-hook-form** + **@hookform/resolvers**: Form handling with Zod validation
- **Radix UI**: Full suite of accessible UI primitives
- **Tailwind CSS**: Utility-first CSS with custom industrial dark theme
- **class-variance-authority** + **clsx** + **tailwind-merge**: Component variant styling


