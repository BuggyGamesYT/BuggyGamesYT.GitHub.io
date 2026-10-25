"""Swap the newest YouTube upload into the Latest upload section of index.html."""
import re, sys, html, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime

FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCbQEjz-XWsJdWfzIdTqOc5Q"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
req = urllib.request.Request(FEED, headers={"User-Agent": "Mozilla/5.0"})
try:
    root = ET.fromstring(urllib.request.urlopen(req, timeout=30).read())
except Exception as e:
    print("Could not read feed:", e); sys.exit(1)
entry = root.find("a:entry", NS)
if entry is None:
    print("Feed had no videos."); sys.exit(1)
vid = entry.find("yt:videoId", NS).text
title = entry.find("a:title", NS).text.strip()
date = datetime.fromisoformat(entry.find("a:published", NS).text).strftime("%b %-d, %Y")
t = html.escape(title, quote=True)
print("Latest:", vid, title, date)

path = "index.html"
page = open(path, encoding="utf-8").read()
if f'watch?v={vid}"' in page.split('id="latest"', 1)[-1].split("</section>", 1)[0]:
    print("Already showing the newest video."); sys.exit(0)

block = f'''<section class="section" id="latest" data-nav="Latest">
          <div class="head">
            <p class="head__eyebrow">Latest upload</p>
            <h2>Fresh out of the void.</h2>
          </div>
          <div class="pair">
            <figure class="band">
              <img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{t}" />
              <figcaption>{t}</figcaption>
            </figure>
            <aside class="callout" aria-label="Latest upload">
              <p class="callout__head"><span class="chip chip--solid">New</span> {date}</p>
              <p class="callout__lead">
                <strong>{t}</strong>
              </p>
              <a class="btn x-rgb" href="https://www.youtube.com/watch?v={vid}" target="_blank" rel="noopener">Watch now</a>
            </aside>
          </div>
        </section>'''
new, n = re.subn(r'<section class="section" id="latest".*?</section>', lambda m: block, page, count=1, flags=re.S)
if n != 1:
    print("Latest section not found."); sys.exit(1)
open(path, "w", encoding="utf-8").write(new)
print("index.html updated.")
