# Truce - Backend Progress Log

Last updated: 30 October 2026

## 1. Project setup
- Node.js Express API configured.
- Python FastAPI agents service configured.
- Mock PayPal mode running successfully.
- API and agents services communicate successfully.

## 2. Guardrails
- Guardrail validation implemented.
- 25 automated tests passing.
- Tests cover offer limits, invalid amounts, currency, dispute stage, deadlines, maximum rounds, kill switch, and message leakage.
- Offers are checked before sending.

## 3. Mock negotiation testing
- Created and tested MOCK-1001 and MOCK-1002.
- MOCK-1001 completed a successful mock negotiation.
- Seller offers: $25, $50, $75, and $100.
- Buyer rejected the first three offers and accepted $100.
- Final dispute status: RESOLVED.
- Final outcome: MOCK_SETTLED_BY_OFFER.

## 4. Freelancer controls
- Tested manual approval workflow.
- Tested freelancer rejection workflow.
- Tested settings updates.
- Invalid floor and ceiling combinations were rejected.
- Valid settings changes affected subsequent offer proposals.
- Tested kill switch enabled and disabled states.

## 5. Audit trail
- Verified GET /api/log returns mock API request records.
- Verified GET /api/disputes/MOCK-1001 returns negotiation history.
- Confirmed seller offers, buyer decisions, timestamps, and messages are recorded.
- Confirmed resolved disputes have no pending offer.

## 6. Remaining work
- Inspect and execute PayPal sandbox spike scripts in order (spike1 to spike6).
- Verify real PayPal sandbox API integration.
- Test sandbox dispute and offer workflows.
- Verify whether buyer acceptance through the API is supported.
- Update this log as further work is completed.

## 7. PayPal sandbox integration

- **Spike 1 – OAuth authentication and scopes:** Passed.
  - Successfully obtained an access token using the PayPal Merchant app.
  - Verified seller dispute permissions, including `disputes/read-seller` and `disputes/update-seller`.

- **Spike 2 – Create and capture payment:** Passed.
  - Created a USD 25 sandbox order.
  - Buyer approved the order.
  - Successfully captured the payment.
  - Capture status: `COMPLETED`.
  - Capture ID: `8AX94118EM894625U`.

- **Spike 3 – List seller disputes:** Passed.
  - Created sandbox dispute `PP-R-HIH-10196200`.
  - Successfully retrieved it using the Seller app's Disputes API.
  - Initial listing returned zero disputes; the dispute appeared after a delay.
  - Initial status: `WAITING_FOR_SELLER_RESPONSE`.
  - Initial state: `REQUIRED_ACTION`.
  - Reason: `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED`.
  - Disputed amount: USD 25.00.

- **Spike 4 – Retrieve and normalize dispute:** Passed.
  - Retrieved the dispute using the Seller app.
  - Normalized its stage as `INQUIRY`.
  - Confirmed `canMakeOffer = true`.
  - Verified that PayPal returned a `make_offer` API link.

- **Spike 5 – Submit seller offer:** Passed.
  - Successfully submitted a USD 5.00 partial refund offer.
  - PayPal recorded the offer with actor `SELLER` and event `PROPOSED`.
  - Retrieved the dispute again and confirmed the seller offer was recorded.
  - Updated status: `UNDER_REVIEW`.
  - The dispute remains at the `INQUIRY` stage.
  - Buyer acceptance has not been tested.

- **Spike 6 – Accept offer as buyer:** Not completed.
  - Script stopped because Buyer app credentials are not configured.
  - No buyer-side API request was made.
  - Buyer-side acceptance and final settlement remain unverified.

## Current status (updated November 5, 2026)

- Mock backend workflow: Tested successfully.
- Guardrail tests: 25 passing.
- PayPal sandbox OAuth: Verified.
- PayPal sandbox order creation and capture: Verified.
- PayPal sandbox dispute creation and retrieval: Verified.
- PayPal sandbox seller-side offer submission: Verified.
- PayPal sandbox buyer-side offer acceptance: Not tested.
- PayPal sandbox final settlement: Not verified.
- `PAYPAL_MODE` remains `mock` for the main application.
