"""
Tests for normalize_frame_count in fight_api.py.

Heavy ML dependencies (torch, transformers) are mocked in conftest.py so
the model is never loaded — only the pure frame-manipulation logic is tested.
"""
import numpy as np
import pytest
from fight_api import normalize_frame_count

TARGET = 16


def _frames(n: int):
    """Create n distinct dummy RGB frames."""
    return [np.full((10, 10, 3), i, dtype=np.uint8) for i in range(n)]


def test_empty_input_returns_empty():
    assert normalize_frame_count([], TARGET) == []


def test_exact_count_returns_same_length():
    frames = _frames(TARGET)
    result = normalize_frame_count(frames, TARGET)
    assert len(result) == TARGET


def test_more_than_target_downsamples():
    frames = _frames(30)
    result = normalize_frame_count(frames, TARGET)
    assert len(result) == TARGET


def test_fewer_than_target_pads_to_target():
    frames = _frames(5)
    result = normalize_frame_count(frames, TARGET)
    assert len(result) == TARGET


def test_padding_fills_with_last_frame():
    frames = _frames(3)
    last_frame = frames[-1]
    result = normalize_frame_count(frames, TARGET)
    # Every padded frame should equal the last original frame
    for padded in result[3:]:
        assert np.array_equal(padded, last_frame)


def test_padding_does_not_mutate_input():
    """Regression: the old code did `frames.append(...)` without copying first,
    which mutated the caller's list. Fixed by `frames = list(frames)` at the top
    of the padding branch."""
    frames = _frames(5)
    original_len = len(frames)
    normalize_frame_count(frames, TARGET)
    assert len(frames) == original_len, "input list must not be mutated"


def test_downsampling_preserves_endpoints():
    """First and last sampled frames should correspond to input[0] and input[-1]."""
    frames = _frames(30)
    result = normalize_frame_count(frames, TARGET)
    assert np.array_equal(result[0], frames[0])
    assert np.array_equal(result[-1], frames[-1])
