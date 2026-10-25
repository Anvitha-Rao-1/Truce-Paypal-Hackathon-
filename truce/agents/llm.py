"""Thin wrapper around the Claude API. Returns None when no key is set."""
import json
import os
import re

try:
    import anthropic
except ImportError:  # the app still runs on rules without the package
    anthropic = None

MODEL = os.getenv("AGENT_MODEL", "claude-sonnet-5-5")


def available() -> bool:
    return anthropic is not None and bool(os.getenv("ANTHROPIC_API_KEY"))


def ask_json(system: str, user: str, max_tokens: int = 400) -> dict:
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("model did not return JSON")
    return json.loads(match.group(0))
