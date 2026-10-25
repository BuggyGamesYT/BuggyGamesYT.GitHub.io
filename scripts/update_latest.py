"""Swap the newest YouTube upload into the Latest upload section of index.html."""
import re, os, sys, json, html, urllib.request, xml.etree.ElementTree as ET
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
if os.environ.get("FORCE") != "true" and f'watch?v={vid}"' in page.split('id="latest"', 1)[-1].split("</section>", 1)[0]:
    print("Already showing the newest video."); sys.exit(0)

def ai_copy(title):
    """Ask GitHub Models for a punny headline and joke line; None if unavailable."""
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        return None
    prompt = (
        "You write copy for Buggy, a YouTuber who posts short clips of video game bugs and glitches. "
        f"His newest video is titled: \"{title}\". Write two things in his playful, deadpan gamer voice:\n"
        "1. headline: starts with 'Fresh out of the void: ' then a short witty summary of the video, max 60 characters total, ending with a period.\n"
        "2. joke: one short funny line about the bug, max 60 characters, like 'The floor had one job.'\n"
        "Keep it family friendly, no hashtags, no emojis. Reply with JSON only: {\"headline\": \"...\", \"joke\": \"...\"}"
    )
    body = json.dumps({"model": "openai/gpt-4o-mini", "temperature": 0.9,
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    r = urllib.request.Request("https://models.github.ai/inference/chat/completions", data=body, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json", "Accept": "application/json"})
    try:
        out = json.loads(urllib.request.urlopen(r, timeout=60).read())["choices"][0]["message"]["content"]
        out = json.loads(out[out.find("{"):out.rfind("}") + 1])
        h, j = out["headline"].strip(), out["joke"].strip()
        if h and j and len(h) <= 90 and len(j) <= 90:
            return h, j
    except Exception as e:
        msg = str(e)
        if hasattr(e, "read"):
            try: msg += " " + e.read().decode()[:500]
            except Exception: pass
        print("AI copy failed:", msg)
        if os.environ.get("FORCE") == "true":
            open("ai-debug.log", "w").write(msg)
    return None

copy = ai_copy(title)
headline, joke = (html.escape(copy[0]), " " + html.escape(copy[1])) if copy else ("Fresh out of the void.", "")
print("Headline:", headline, "| Joke:", joke)

block = f'''<section class="section" id="latest" data-nav="Latest">
          <div class="head">
            <p class="head__eyebrow">Latest upload</p>
            <h2>{headline}</h2>
          </div>
          <div class="pair">
            <figure class="band">
              <img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="{t}" />
              <figcaption>{t}</figcaption>
            </figure>
            <aside class="callout" aria-label="Latest upload">
              <p class="callout__head"><span class="chip chip--solid">New</span> {date}</p>
              <p class="callout__lead">
                <strong>{t}</strong>{joke}
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
