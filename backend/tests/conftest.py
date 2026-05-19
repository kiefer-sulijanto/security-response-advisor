from __future__ import annotations

import base64
import copy
import os
import sys
from unittest.mock import MagicMock

import cv2
import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Module-level patches — must run before any test module is collected so that
# import-time side-effects (YOLO weight loading, fight model loading) are
# avoided without requiring real model files to be present.
# ---------------------------------------------------------------------------

# Prevent ultralytics from loading real YOLO weights when CCTVExtractor is
# imported at collection time or via app.state.
if "ultralytics" not in sys.modules:
    _fake_ul = MagicMock()
    _fake_ul.YOLO = MagicMock(return_value=MagicMock())
    sys.modules["ultralytics"] = _fake_ul

# Force fight detection off so no fight model file is required when
# state.py creates CCTVExtractor objects at import time.
os.environ["FIGHT_DETECTION_MODE"] = "off"

# Empty API key makes advisory fall back to rules-based response without
# any real OpenAI network call.
os.environ.setdefault("OPENAI_API_KEY", "")


# ---------------------------------------------------------------------------
# Shared helper functions (importable by test modules)
# ---------------------------------------------------------------------------

def make_frame(value: int = 128, width: int = 32, height: int = 32) -> np.ndarray:
    """Return a solid-colour BGR ndarray suitable for cv2 operations."""
    return np.full((height, width, 3), value, dtype=np.uint8)


def make_jpeg_b64(value: int = 128, width: int = 32, height: int = 32) -> str:
    """Return a small solid-colour JPEG encoded as a base64 string."""
    frame = make_frame(value, width, height)
    ok, buf = cv2.imencode(".jpg", frame)
    assert ok, "cv2.imencode failed inside test helper"
    return base64.b64encode(buf).decode("utf-8")


# ---------------------------------------------------------------------------
# State reset — runs automatically before every test to prevent cross-test
# pollution of the shared in-memory state.
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_state():
    from app import state  # imported lazily so the patch above is already active

    state.incidents_db.clear()
    state.dispatches_db.clear()
    state.reports_db.clear()
    state.latest_cctv_snapshots.clear()
    state.officers_db.clear()
    state.officers_db.extend(copy.deepcopy(state.INITIAL_OFFICERS_DB))
    state.pipeline.reset_state()
    yield
