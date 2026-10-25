from typing import Literal, Optional
from pydantic import BaseModel, Field


class Limits(BaseModel):
    floor: float          # first offer we make (lowest)
    ceiling: float        # the most we will ever refund. Never leaves the seller side.
    step: float           # how much we add each round
    currency: str = "USD"
    allowed_types: list[str] = ["REFUND"]


class DisputeCtx(BaseModel):
    id: str
    amount: float
    currency: str = "USD"
    reason: Optional[str] = None
    buyer_messages: list[str] = []
    days_left: Optional[float] = None


class HistoryItem(BaseModel):
    by: str                       # seller_agent | buyer
    type: Optional[str] = None
    amount: Optional[float] = None
    message: Optional[str] = None


class SellerRequest(BaseModel):
    dispute: DisputeCtx
    scope_text: str = ""
    limits: Limits
    history: list[HistoryItem] = []
    round: int = Field(1, ge=1)
    force_rules: bool = False     # Node sets this after the guardrail blocks an AI offer


class SellerProposal(BaseModel):
    action: Literal["offer", "wait"]
    offer_type: str = "REFUND"
    amount: Optional[float] = None
    message: str = ""
    source: Literal["llm", "rules"] = "rules"


class BuyerRequest(BaseModel):
    offer_amount: Optional[float] = None
    dispute_amount: float
    goal_pct: float = 60          # the buyer is happy at this % of the amount
    round: int = 1
    seller_message: str = ""


class BuyerDecision(BaseModel):
    action: Literal["accept", "reject"]
    message: str
    source: Literal["llm", "rules"] = "rules"
