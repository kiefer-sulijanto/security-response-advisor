"""
Prevent fight_api.py from loading the ML model (torch, transformers) during tests.
This file is automatically picked up by pytest before any test in this directory.
"""
import sys
from unittest.mock import MagicMock

class _BaseModel:
    """Minimal stand-in so `class FightClipRequest(BaseModel)` doesn't crash."""
    pass

_mock_pydantic = MagicMock()
_mock_pydantic.BaseModel = _BaseModel

sys.modules.setdefault('torch', MagicMock())
sys.modules.setdefault('transformers', MagicMock())
sys.modules.setdefault('cv2', MagicMock())
sys.modules.setdefault('fastapi', MagicMock())
sys.modules.setdefault('pydantic', _mock_pydantic)
