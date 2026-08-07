from .regex_patterns import PIIMatch
from typing import List

def deduplicate(results: List[PIIMatch], min_confidence: float = 0.5) -> List[PIIMatch]:
    """
    Merge overlapping PII detections from multiple sources.
    Rules:
      1. Filter by min_confidence threshold
      2. Sort by start position, then descending confidence
      3. For overlapping spans: keep highest confidence
      4. Exact duplicate (same text + label + position) → keep one
    """
    # Filter by confidence
    filtered = [r for r in results if r.confidence >= min_confidence]
    
    if not filtered:
        return []
    
    # Sort: start pos ascending, confidence descending
    filtered.sort(key=lambda x: (x.start, -x.confidence))
    
    merged: List[PIIMatch] = []
    for current in filtered:
        if not merged:
            merged.append(current)
            continue
        
        last = merged[-1]
        
        # Check for exact duplicate
        if (current.start == last.start and
            current.end == last.end and
            current.entity_type == last.entity_type):
            # Keep highest confidence
            if current.confidence > last.confidence:
                merged[-1] = current
            continue
        
        # Check for overlap
        if current.start < last.end:
            # Overlapping — keep higher confidence
            if current.confidence > last.confidence:
                merged[-1] = current
            # else keep last (already higher confidence)
        else:
            # No overlap
            merged.append(current)
    
    return merged


def merge_all_sources(
    regex_results: List[PIIMatch],
    presidio_results: List[PIIMatch],
    spacy_results: List[PIIMatch],
    min_confidence: float = 0.5
) -> List[PIIMatch]:
    """Combine results from all three sources and deduplicate."""
    all_results = regex_results + presidio_results + spacy_results
    deduped = deduplicate(all_results, min_confidence)
    return sorted(deduped, key=lambda x: x.start)
