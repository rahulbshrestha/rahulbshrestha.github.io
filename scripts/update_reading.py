"""Sync the Goodreads to-read shelf into _data/reading.json.

Goodreads no longer offers a public API, but each shelf has an RSS feed.
This reads every page of that feed and writes the books the Reading page shows.
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
SHELF = "to-read"
FEED_URL = "https://www.goodreads.com/review/list_rss/{user}?shelf={shelf}&page={page}"
OUTPUT = Path(__file__).resolve().parent.parent / "_data" / "reading.json"
MAX_PAGES = 50  # 100 books per page


def fetch_page(page):
    url = FEED_URL.format(user=USER_ID, shelf=SHELF, page=page)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (reading-list sync)"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return ET.fromstring(response.read()).findall("./channel/item")


def text(item, tag):
    return (item.findtext(tag) or "").strip()


def cover_url(item):
    url = text(item, "book_large_image_url") or text(item, "book_medium_image_url")
    # Goodreads uses a generic "nophoto" image when a book has no cover
    return "" if not url or "nophoto" in url else url


def parse(item):
    added = text(item, "user_date_added")
    return {
        "title": re.sub(r"\s+", " ", text(item, "title")),
        "author": re.sub(r"\s+", " ", text(item, "author_name")),
        "url": f"https://www.goodreads.com/book/show/{text(item, 'book_id')}",
        "cover": cover_url(item),
        "added": parsedate_to_datetime(added).date().isoformat() if added else "",
    }


def main():
    books = []
    for page in range(1, MAX_PAGES + 1):
        items = fetch_page(page)
        if not items:
            break
        books.extend(parse(item) for item in items)

    # An empty result usually means the feed is down or the profile went private;
    # keep the existing list rather than wiping the page.
    if not books:
        sys.exit("No books returned from Goodreads; leaving the existing list unchanged.")

    OUTPUT.write_text(json.dumps(books, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(books)} books to {OUTPUT.relative_to(OUTPUT.parent.parent)}")


if __name__ == "__main__":
    main()
