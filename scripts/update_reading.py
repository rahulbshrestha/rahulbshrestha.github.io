"""Sync the Goodreads "read", "currently-reading" and "to-read" shelves into _data/reading.json.

Goodreads retired its shelf RSS feeds in October 2026 and shelf pages now need a sign-in,
so this reads each shelf from Goodreads' public bookshelf widget instead.
Run from the repo root: python3 scripts/update_reading.py
"""
import html
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

USER_ID = "86408735"
# Shelf name on Goodreads -> (key in reading.json, sort order)
SHELVES = {
    "read": ("read", "date_read"),
    "currently-reading": ("currently_reading", "date_added"),
    "to-read": ("to_read", "date_added"),
}
WIDGET_URL = "https://www.goodreads.com/review/custom_widget/{user}.shelf?"
MAX_BOOKS = 100  # the widget returns at most 100 books per request
OUTPUT = Path(__file__).resolve().parent.parent / "_data" / "reading.json"


def fetch_widget(shelf, sort, order):
    params = {
        "shelf": shelf, "sort": sort, "order": order, "num_books": MAX_BOOKS,
        "show_author": 1, "show_cover": 1, "show_rating": 1, "show_title": 1,
        # Goodreads caches the widget per widget_id, so each request needs its own
        "widget_id": "rbs-%s-%s" % (shelf, order),
    }
    url = WIDGET_URL.format(user=USER_ID) + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (reading-list sync)"})
    with urllib.request.urlopen(request, timeout=30) as response:
        js = response.read().decode("utf-8", errors="replace")
    # The widget is JavaScript that writes HTML; undo the string escaping to get the markup
    return re.sub(r"\\(.)", r"\1", js.replace("\\n", "\n"))


def full_size_cover(url):
    # Widget covers are thumbnails like "...31557033._SY75_.jpg"; drop the size suffix
    return "" if "nophoto" in url else re.sub(r"\._S[XY]\d+_(?=\.)", "", url)


def parse(markup):
    books = []
    for block in re.split(r'<div class="gr_custom_each_container', markup)[1:]:
        cover = re.search(r'<a title="([^"]*)"[^>]*href="([^"]+)"><img[^>]*src="([^"]+)"', block)
        author = re.search(r'gr_custom_author[^>]*>\s*by\s*<a[^>]*>([^<]+)</a>', block)
        rating = re.search(r'gr_custom_rating[^>]*>(.*?)</div>', block, re.S)
        if not cover:
            continue
        books.append({
            "title": re.sub(r"\s+", " ", html.unescape(cover.group(1))).strip(),
            "author": re.sub(r"\s+", " ", html.unescape(author.group(1))).strip() if author else "",
            "url": html.unescape(cover.group(2)).split("?")[0],
            "cover": full_size_cover(cover.group(3)),
            # each filled star is one "star_active" image; unrated books have none
            "rating": rating.group(1).count("star_active") if rating else 0,
        })
    return books


def main():
    data = {}
    for shelf, (key, sort) in SHELVES.items():
        books = parse(fetch_widget(shelf, sort, "d"))
        if len(books) == MAX_BOOKS:
            # The widget has no paging: add the oldest books too, which covers shelves up to 200
            seen = {b["url"] for b in books}
            books += [b for b in reversed(parse(fetch_widget(shelf, sort, "a"))) if b["url"] not in seen]
        data[key] = books

    # Every shelf empty means the widget broke or the profile went private;
    # keep the existing list rather than wiping the page. (One empty shelf is fine.)
    if not any(data.values()):
        sys.exit("No books returned from Goodreads; leaving the existing list unchanged.")

    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    counts = ", ".join(f"{len(books)} {key}" for key, books in data.items())
    print(f"Wrote {counts} to {OUTPUT.relative_to(OUTPUT.parent.parent)}")


if __name__ == "__main__":
    main()
