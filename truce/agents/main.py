from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402

import buyer  # noqa: E402
import llm  # noqa: E402
import seller  # noqa: E402
from schemas import BuyerDecision, BuyerRequest, SellerProposal, SellerRequest  # noqa: E402

app = FastAPI(title="Truce agents")


@app.get("/health")
def health():
    return {"ok": True, "llm": llm.available(), "model": llm.MODEL if llm.available() else None}


@app.post("/seller/propose", response_model=SellerProposal)
def seller_propose(req: SellerRequest):
    return seller.propose(req)


@app.post("/buyer/respond", response_model=BuyerDecision)
def buyer_respond(req: BuyerRequest):
    return buyer.respond(req)
