"""
decision_layer.py - Enforce the project's policy before any change ships.

This is the Laya System 1 layer for Redundant Arcade. It does not plan and
it does not write code. It answers the project's own fixed policy questions
in one pass, then emits the gates that must be satisfied.

    from decision_layer import decide
    d = decide("add a rewarded ad skip to bomb relay")
    print(d.action, d.gates)

Run standalone:  python decision_layer.py
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

import laya

from shell_policy import (GATES, LANE_GATES, RISK_ORDER, SHELL_QUESTIONS)

#: Risk grades at or above this always require a human.
#:
#: HISTORY: this was 2 ("medium") and blocked 7 of 8 realistic requests,
#: which made the layer noise rather than signal. The floor is now 3
#: ("high"), so ordinary work proceeds WITH its gates attached and only
#: genuinely dangerous work blocks.
#:
#: Rationale for keeping any floor at all: per AGENT.md a change is not
#: done until BUILD.bat has run and the user has tested on device, so
#: nothing above "low" should ever be silent. The gates, not the blocker,
#: carry the safety for medium work.
HUMAN_REQUIRED_FROM = 3          # index into RISK_ORDER -> "high"

#: These lanes are never run unattended regardless of stated risk. This is
#: the hard part of option A: loosening the risk floor must not accidentally
#: let an ad callback or a keystore change through unattended, because that
#: is exactly where this project has already been burned.
ALWAYS_HUMAN_LANES = {"ads_and_monetisation", "release_and_publish"}


@dataclass
class Decision:
    request: str
    lane: str
    risk: str
    scope: float
    confidence: float
    needs_human: bool
    action: str                    # PROCEED | PROCEED_WITH_GATES | STOP
    blockers: list = field(default_factory=list)
    gates: list = field(default_factory=list)
    latency_ms: float = 0.0
    probabilities: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "request": self.request[:100],
            "lane": self.lane,
            "risk": self.risk,
            "scope": round(self.scope, 2),
            "confidence": round(self.confidence, 3),
            "needs_human": self.needs_human,
            "action": self.action,
            "blockers": self.blockers,
            "gates": [{"id": g, "check": GATES[g]} for g in self.gates],
            "latency_ms": round(self.latency_ms),
        }

    def render(self) -> str:
        out = [
            "",
            "=" * 74,
            f"LANE      {self.lane}",
            f"RISK      {self.risk}   (scope {self.scope:.1f}, conf {self.confidence:.2f}, "
            f"{self.latency_ms:.0f} ms)",
            f"DECISION  {self.action}",
        ]
        if self.blockers:
            out.append("BLOCKERS")
            out += [f"  - {b}" for b in self.blockers]
        if self.gates:
            out.append("GATES THAT MUST PASS BEFORE THIS SHIPS")
            for g in self.gates:
                out.append(f"  [{g}] {GATES[g]}")
        out.append("=" * 74)
        return "\n".join(out)


class DecisionLayer:
    def __init__(self, model: str | None = None):
        self._router = None
        self._model = model      # None -> Laya auto-routes the checkpoint

    @property
    def router(self):
        if self._router is None:
            self._router = laya.Router()
        return self._router

    def decide(self, request: str) -> Decision:
        if not request or not request.strip():
            raise ValueError("request must be a non-empty string")

        t0 = time.perf_counter()
        res = self.router.predict(request, SHELL_QUESTIONS, model=self._model)
        ms = (time.perf_counter() - t0) * 1000

        a = res["answers"]
        lane = a["lane"]["choice"]
        risk = a["risk"]["choice"]
        scope = float(a["scope"]["score"])
        conf = float(a["lane"]["confidence"])
        needs_human = bool(a["needs_human"]["noul"] >= 0.5)

        # ---- blockers -------------------------------------------------
        blockers: list[str] = []
        if lane in ALWAYS_HUMAN_LANES:
            blockers.append(
                f"lane '{lane}' is never run unattended - "
                "ads and release signing need a human")
        if RISK_ORDER.index(risk) >= HUMAN_REQUIRED_FROM:
            floor = RISK_ORDER[HUMAN_REQUIRED_FROM]
            blockers.append(f"risk is '{risk}' ({floor} or above needs a human)")
        if needs_human:
            blockers.append("model flagged needs_human")
        if conf < 0.05:
            blockers.append(
                f"lane confidence is very low ({conf:.3f}) - "
                "the request may not match any lane")

        gates = list(LANE_GATES.get(lane, []))

        if blockers:
            action = "STOP"
        elif gates:
            action = "PROCEED_WITH_GATES"
        else:
            action = "PROCEED"

        return Decision(
            request=request, lane=lane, risk=risk, scope=scope, confidence=conf,
            needs_human=needs_human, action=action, blockers=blockers,
            gates=gates, latency_ms=ms,
            probabilities=a["lane"].get("probabilities", {}),
        )


#: Module-level singleton so the checkpoint loads once per session.
_LAYER: DecisionLayer | None = None


def decide(request: str) -> Decision:
    global _LAYER
    if _LAYER is None:
        _LAYER = DecisionLayer()
    return _LAYER.decide(request)
