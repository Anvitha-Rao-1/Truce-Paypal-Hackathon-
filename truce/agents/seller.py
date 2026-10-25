import json

import llm
from schemas import SellerProposal, SellerRequest

SYSTEM = """You are the seller's negotiation agent for a PayPal dispute that is still at the inquiry stage.
Goal: settle fairly and fast so it never becomes a claim, while paying back as little as you reasonably can.
Hard rules:
- Reply with JSON only: {"action": "offer" or "wait", "amount": number, "message": string}
- amount must be between floor and ceiling (inclusive) and never lower than your previous offer.
- NEVER mention the ceiling, the floor, a budget, a limit, or any money figure other than the offer amount itself.
- The message is 2 to 4 plain sentences, polite, and refers to the agreed scope of work.
- Use action "wait" only if you already offered the ceiling and nothing new has happened."""


def _money(x: float) -> float:
    return round(float(x), 2)


def last_offer(req: SellerRequest) -> float:
    amounts = [h.amount for h in req.history if h.by == "seller_agent" and h.amount is not None]
    return max(amounts) if amounts else 0.0


def rules(req: SellerRequest) -> SellerProposal:
    lim = req.limits
    prev = last_offer(req)
    if prev >= lim.ceiling and req.round > 1:
        return SellerProposal(action="wait", message="Final offer stands.", source="rules")
    amount = min(lim.floor + (req.round - 1) * lim.step, lim.ceiling)
    amount = _money(max(amount, prev))
    scope = req.scope_text.strip() or "the agreed work"
    msg = (
        f"Thanks for raising this. We delivered {scope}. "
        f"To settle this quickly we can refund {amount:.2f} {lim.currency} right away. "
        "Please accept the offer if that works for you."
    )
    return SellerProposal(action="offer", offer_type="REFUND", amount=amount, message=msg, source="rules")


def propose(req: SellerRequest) -> SellerProposal:
    fallback = rules(req)
    if req.force_rules or not llm.available() or fallback.action == "wait":
        return fallback
    try:
        user = json.dumps(
            {
                "dispute_reason": req.dispute.reason,
                "dispute_amount": req.dispute.amount,
                "buyer_messages": req.dispute.buyer_messages[-3:],
                "agreed_scope": req.scope_text,
                "floor": req.limits.floor,
                "ceiling": req.limits.ceiling,
                "previous_offer": last_offer(req),
                "round": req.round,
            }
        )
        out = llm.ask_json(SYSTEM, user)
        amount = _money(out["amount"])
        ok = (
            out.get("action") == "offer"
            and req.limits.floor <= amount <= req.limits.ceiling
            and amount >= last_offer(req)
            and bool(str(out.get("message", "")).strip())
        )
        if not ok:
            return fallback
        return SellerProposal(
            action="offer", offer_type="REFUND", amount=amount, message=str(out["message"]).strip(), source="llm"
        )
    except Exception:
        return fallback
