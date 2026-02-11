#!/usr/bin/env python3
"""UI/UX Pro Max local search helper.

Data source:
  ../data/knowledge_base.json

Usage:
  python3 .shared/ui-ux-pro-max/scripts/search.py "mobile dashboard" --domain product
  python3 .shared/ui-ux-pro-max/scripts/search.py "responsive layout" --stack react
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

BASE_DIR = Path(__file__).resolve().parents[1]
KB_PATH = BASE_DIR / "data" / "knowledge_base.json"


@dataclass(frozen=True)
class Entry:
    title: str
    tags: Tuple[str, ...]
    bullets: Tuple[str, ...]


STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "over",
    "under",
    "about",
    "your",
    "you",
    "app",
    "ui",
    "ux",
}


def load_knowledge_base() -> tuple[Dict[str, Tuple[Entry, ...]], Dict[str, Tuple[Entry, ...]]]:
    if not KB_PATH.exists():
        raise FileNotFoundError(f"Knowledge base not found: {KB_PATH}")

    with KB_PATH.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    domains_raw = raw.get("domains")
    stacks_raw = raw.get("stacks")
    if not isinstance(domains_raw, dict) or not isinstance(stacks_raw, dict):
        raise ValueError("knowledge_base.json must include object keys: 'domains' and 'stacks'.")

    def parse_group(group: dict) -> Dict[str, Tuple[Entry, ...]]:
        parsed: Dict[str, Tuple[Entry, ...]] = {}
        for key, entries in group.items():
            if not isinstance(entries, list):
                raise ValueError(f"'{key}' must map to a list of entries.")

            converted: List[Entry] = []
            for idx, entry in enumerate(entries):
                if not isinstance(entry, dict):
                    raise ValueError(f"Entry {idx} in '{key}' must be an object.")

                title = entry.get("title")
                tags = entry.get("tags")
                bullets = entry.get("bullets")

                if not isinstance(title, str) or not title.strip():
                    raise ValueError(f"Entry {idx} in '{key}' needs non-empty string 'title'.")
                if not isinstance(tags, list) or not all(isinstance(t, str) and t.strip() for t in tags):
                    raise ValueError(f"Entry {idx} in '{key}' needs string list 'tags'.")
                if not isinstance(bullets, list) or not all(isinstance(b, str) and b.strip() for b in bullets):
                    raise ValueError(f"Entry {idx} in '{key}' needs string list 'bullets'.")

                converted.append(
                    Entry(
                        title=title.strip(),
                        tags=tuple(t.strip().lower() for t in tags),
                        bullets=tuple(b.strip() for b in bullets),
                    )
                )

            parsed[key] = tuple(converted)
        return parsed

    return parse_group(domains_raw), parse_group(stacks_raw)


def tokenize(text: str) -> List[str]:
    parts = re.findall(r"[a-z0-9\-]+", text.lower())
    return [p for p in parts if p not in STOPWORDS and len(p) > 1]


def score_entry(query_tokens: Sequence[str], entry: Entry) -> int:
    if not query_tokens:
        return 1

    text = " ".join((entry.title, " ".join(entry.tags), " ".join(entry.bullets))).lower()
    total = 0
    for token in query_tokens:
        if token in entry.tags:
            total += 5
        if token in text:
            total += 2
    return total


def rank_entries(entries: Sequence[Entry], query: str) -> List[Tuple[int, Entry]]:
    q = tokenize(query)
    scored = [(score_entry(q, e), e) for e in entries]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored


def print_results(scope: str, query: str, ranked: Sequence[Tuple[int, Entry]], top_k: int) -> None:
    print(f"[ui-ux-pro-max] scope={scope}")
    print(f"query: {query}")
    print("-" * 56)

    shown = 0
    for score, entry in ranked:
        if shown >= top_k:
            break
        if score <= 0 and shown > 0:
            break

        shown += 1
        print(f"{shown}. {entry.title} (score={score})")
        print(f"   tags: {', '.join(entry.tags)}")
        for bullet in entry.bullets:
            print(f"   - {bullet}")

    if shown == 0:
        print("No strong matches. Try broader keywords.")


def parse_args(available_domains: Sequence[str], available_stacks: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Search UI/UX Pro Max local knowledge.")
    parser.add_argument("query", type=str, help="Search query keywords")

    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--domain", type=str, help=f"Domain search ({', '.join(available_domains)})")
    scope.add_argument("--stack", type=str, help=f"Stack search ({', '.join(available_stacks)})")

    parser.add_argument("--top", type=int, default=3, help="Number of results (default: 3)")
    args = parser.parse_args()

    if args.domain and args.domain not in available_domains:
        parser.error(f"Invalid --domain '{args.domain}'. Choose from: {', '.join(available_domains)}")
    if args.stack and args.stack not in available_stacks:
        parser.error(f"Invalid --stack '{args.stack}'. Choose from: {', '.join(available_stacks)}")

    return args


def main() -> int:
    try:
        domain_data, stack_data = load_knowledge_base()
    except Exception as exc:
        print(f"Error loading knowledge base: {exc}")
        return 1

    domains = tuple(sorted(domain_data.keys()))
    stacks = tuple(sorted(stack_data.keys()))

    args = parse_args(domains, stacks)
    top_k = max(1, min(args.top, 10))

    if args.domain:
        entries = domain_data.get(args.domain, ())
        ranked = rank_entries(entries, args.query)
        print_results(f"domain:{args.domain}", args.query, ranked, top_k)
        return 0

    if args.stack:
        entries = stack_data.get(args.stack, ())
        ranked = rank_entries(entries, args.query)
        print_results(f"stack:{args.stack}", args.query, ranked, top_k)
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
