import json

import llm
from schemas import BuyerDecision, BuyerRequest

SYSTEM = """You play a client who opened a PayPal dispute about a freelance job.
You are given your decision already. Write 1 or 2 natural sentences that explain it.
Reply with JSON only: {"message": string}. Never invent numbers."""


def respond(req: BuyerRequest) -> BuyerDecision:
    goal = round(req.dispute_amount * req.goal_pct / 100, 2)
    offer = req.offer_amount or 0.0
    accept = offer >= goal
    fallback_msg = (
        "That works for me, thanks for sorting it out."
        if accept
        else "That is lower than I expected. I would need a better offer to close this."
    )
    decision = BuyerDecision(action="accept" if accept else "reject", message=fallback_msg, source="rules")
    if not llm.available():
        return decision
    try:
        out = llm.ask_json(
            SYSTEM,
            json.dumps({"decision": decision.action, "offer": offer, "round": req.round, "seller_message": req.seller_message}),
            max_tokens=200,
        )
        if str(out.get("message", "")).strip():
            decision.message = str(out["message"]).strip()
            decision.source = "llm"
    except Exception:
        pass
    return decision
