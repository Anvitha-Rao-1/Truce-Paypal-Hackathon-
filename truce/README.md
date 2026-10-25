# Truce

Two AI agents settle a PayPal dispute during the inquiry stage, before it becomes a claim.
The freelancer sets limits and approves offers. A guardrail in code enforces the limits.

Built for the PayPal AI Hackathon 2026. MIT licensed.

## Run it in 10 minutes (no PayPal account needed)

You need Node 20+ and Python 3.11+. Use three terminals.

```bash
# Terminal 1: agents (Python)
cd agents
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # optional: add ANTHROPIC_API_KEY for AI-written offers
uvicorn main:app --port 8000

# Terminal 2: API (Node)
cd api
npm install
cp .env.example .env             # PAYPAL_MODE=mock by default
npm run dev

# Terminal 3: web (React)
cd web
npm install
npm run dev                      # open http://localhost:5173
```

Click "+ Mock 1", type what was promised, press Save, then "Run agent" and "Approve and send".

## Use the real PayPal sandbox

1. Create sandbox accounts and an app at https://developer.paypal.com (see docs).
2. Put the client id and secret in `api/.env` and set `PAYPAL_MODE=sandbox`.
3. Run the spike scripts in `api/scripts` in order (spike1 to spike6).

## How it works

- `agents/` Python FastAPI service. Seller agent proposes offers, buyer agent plays the client in mock mode.
- `api/src/guardrail.js` the single gate every offer must pass before a PayPal call.
- `api/src/negotiator.js` the loop: refresh, propose, gate, approve, send.
- `api/src/paypal.js` real PayPal Disputes API client. `mockPaypal.js` is the in-memory stand-in.
- `web/` React dashboard with live updates and an API log.

## Tests

```bash
cd api && npm test
```

## Honest limits

- PayPal sends no webhook for offers or messages, so the API polls.
- Whether a sandbox buyer can accept offers through the API depends on PayPal granting buyer scopes.
  If not, a human plays the buyer in the sandbox Resolution Center.
- Mock mode is for development. It is labelled in the UI.
