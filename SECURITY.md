# Security

## What this repo must never do

- Store brokerage credentials.  
- Place, route, or cancel orders.  
- Treat shadow-mode as production trading.

`ShadowEngine.placeOrder` / `sendOrder` throw `ORDER_AUTHORITY_DENIED` by design.

## Reporting

If you find a path that can send an order, leak secrets, or open confirmation into a model: open a private security advisory or email the owner. Do not file a public issue that includes credentials.
