# Handshake browser demo

Static adaptation of the Handshake app, ready for Vercel. No build, dependencies, server, environment variables or database required.

## Deploy on Vercel

Import `lelbob/handshake-demo`, keep the repository root directory, select **Other** as framework and **public** as output directory. Leave the build command empty, then Deploy. `vercel.json` supplies these settings.

Open `/` for the customer app, `/mobile.html` for the phone preview, and `/admin.html` for staff screens.

## Try a complete flow

Create a payment request, shop or escrow deal. Use **Demo controls** at the bottom of the page to switch between seller, buyer and finance roles. For escrow, copy the invitation key before switching to buyer. Authorize a simulated payment, open the provider simulator and choose a result. Switch back to seller to mark an escrow delivered, then buyer to release. Payout completes after approximately two seconds while the app is open.

Staff demo password: `handshake-demo-2026`. This is a displayed demo value, not a secret or real authentication.

## Demo boundaries

All records are stored in localStorage in the current browser. The selected role is stored per tab. Refresh preserves records; clearing browser data or Reset demo data removes them. Public links and recovery keys cannot transfer records to another browser or device. All roles and records can be inspected or edited by the visitor. Use fictional information only.

No real payments, bank connections, account verification, custody, shared database, production authentication, evidence uploads or financial ledger are provided. Staff reconciliation is a visual placeholder, not a verified ledger. Partial settlement and advanced recovery are available in the original full local app, not this static demo.

## Preview locally

Run `python -m http.server 8810 --directory public`, then open http://127.0.0.1:8810.

The original full app remains unchanged in the project workspace. This repository contains only its public assets and browser simulation adapter; no database, recovery records, environment files or local logs are included.
