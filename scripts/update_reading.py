"""Sync the Goodreads "read", "currently-reading" and "to-read" shelves into _data/reading.json.

Goodreads no longer offers a public API, but each shelf has an RSS feed.
This reads every page of those feeds and writes the books the Reading page shows.
Run from the repo root: python3 scripts/update_reading.py
"""
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

USER_ID = "86408735"
# Shelf name on Goodreads -> key in reading.json
SHELVES = {"read": "read", "currently-reading": "currently_reading", "to-read": "to_read"}
FEED_URL = "https://www.goodreads.com/review/list_rss/{user}?shelf={shelf}&page={page}"
OUTPUT = Path(__file__).resolve().parent.parent / "_data" / "reading.json"
MAX_PAGES = 50  # 100 books per page


def fetch_page(shelf, page):
    url = FEED_URL.format(user=USER_ID, shelf=shelf, page=page)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (reading-list sync)"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return ET.fromstring(response.read()).findall("./channel/item")


def text(item, tag):
    return (item.findtext(tag) or "").strip()


def cover_url(item):
    url = text(item, "book_large_image_url") or text(item, "book_medium_image_url")
    # Goodreads uses a generic "nophoto" image when a book has no cover
    return "" if not url or "nophoto" in url else url


def iso_date(value):
    return parsedate_to_datetime(value).date().isoformat() if value else ""


def parse(item):
    return {
        "title": re.sub(r"\s+", " ", text(item, "title")),
        "author": re.sub(r"\s+", " ", text(item, "author_name")),
        "url": f"https://www.goodreads.com/book/show/{text(item, 'book_id')}",
        "cover": cover_url(item),
        "added": iso_date(text(item, "user_date_added")),
        "read_at": iso_date(text(item, "user_read_at")),
        "rating": int(text(item, "user_rating") or 0),  # 0 means not rated
    }


def fetch_shelf(shelf):
    books = []
    for page in range(1, MAX_PAGES + 1):
        items = fetch_page(shelf, page)
        if not items:
            break
        books.extend(parse(item) for item in items)
    return books


def main():
    data = {}
    for shelf, key in SHELVES.items():
        books = fetch_shelf(shelf)
        # An empty shelf usually means the feed is down or the profile went private;
        # keep the existing list rather than wiping the page.
        if not books:
            sys.exit(f"No books returned for '{shelf}'; leaving the existing list unchanged.")
        data[key] = books

    # Most recently finished first; books without a finish date fall back to when they were added
    data["read"].sort(key=lambda b: b["read_at"] or b["added"], reverse=True)

    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    counts = ", ".join(f"{len(books)} {key}" for key, books in data.items())
    print(f"Wrote {counts} to {OUTPUT.relative_to(OUTPUT.parent.parent)}")


if __name__ == "__main__":
    main()
