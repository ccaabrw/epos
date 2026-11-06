# Juniper Bistro EPOS

A responsive, dependency-free bistro till demonstration.

## Run

With Node.js 20 or newer:

```sh
npm start
```

Open http://localhost:3000. Set `PORT` to use a different port.

```sh
npm test
```

## Features

- Searchable menu with category filters, prices in GBP and local illustrations.
- Dine-in tables and guest counts, or takeaway orders.
- Quantity adjustments, kitchen and order notes, percentage discounts, and optional 10% dine-in service.
- Simulated card and cash checkout, cash change calculations, and receipts.
- Local order history and today's sales overview.
- Responsive layouts and keyboard-accessible controls; press `/` to search.

All monetary calculations use integer pennies; discounts are rounded first,
then service is calculated on the discounted subtotal. Prices include VAT.
Draft orders and the latest 500 completed sales persist in this browser's
local storage. Clearing browser data removes these records.

**Demo only:** no real payments, fiscal receipts, kitchen dispatch, user
authentication, shared-device synchronisation, or durable server-side storage
are provided. Do not use this demonstration for live trading.