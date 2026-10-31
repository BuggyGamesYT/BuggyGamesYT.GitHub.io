"""Swap the newest YouTube upload into the Latest upload section of index.html."""
import re, os, sys, json, html, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime

FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCbQEjz-XWsJdWfzIdTqOc5Q"
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
import time
req = urllib.request.Request(FEED, headers={"User-Agent": "Mozilla/5.0"})
root = None
for attempt in range(5):
    try:
        root = ET.fromstring(urllib.request.urlopen(req, timeout=30).read())
        break
    except Exception as e:
        print(f"Feed attempt {attempt + 1} failed:", e)
        time.sleep(15 * (attempt + 1))
if root is None:
    # YouTube's feed 404s now and then; skip this run quietly instead of failing (stats still commit).
    print("Could not read feed; skipping the latest upload this run."); sys.exit(0)
entry = root.find("a:entry", NS)
if entry is None:
    print("Feed had no videos; skipping."); sys.exit(0)
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
    """Use the headline and joke the workflow's AI step wrote; None if unavailable."""
    resp = os.environ.get("AI_RESPONSE", "")
    try:
        out = json.loads(resp[resp.find("{"):resp.rfind("}") + 1])
        h, j = out["headline"].strip(), out["joke"].strip()
        if h and j and len(h) <= 90 and len(j) <= 90:
            return h, j
    except Exception:
        if os.environ.get("FORCE") == "true":
            open("ai-debug.log", "w").write("AI step reply: " + resp[:400])
    return None

def _old_ai_copy(title):
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
    msgs = [{"role": "user", "content": prompt}]
    endpoints = [
        ("https://models.github.ai/inference/chat/completions", "openai/gpt-4o-mini",
         {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}),
        ("https://models.inference.ai.azure.com/chat/completions", "gpt-4o-mini", {"Accept": "application/json"}),
    ]
    errors = []
    for url, model, extra in endpoints:
        body = json.dumps({"model": model, "temperature": 0.9, "messages": msgs}).encode()
        r = urllib.request.Request(url, data=body, method="POST", headers={
            "Authorization": f"Bearer {token}", "Content-Type": "application/json", **extra})
        try:
            result = _ask(r)
            if result:
                return result
        except Exception as e:
            msg = f"{url}: {e}"
            if hasattr(e, "read"):
                try: msg += " " + e.read().decode()[:300]
                except Exception: pass
            errors.append(msg)
    print("AI copy failed:", " | ".join(errors))
    if os.environ.get("FORCE") == "true":
        open("ai-debug.log", "w").write(" | ".join(errors))
    return None

def _ask(r):
    if True:
        raw = urllib.request.urlopen(r, timeout=60).read().decode("utf-8", "ignore")
        try:
            out = json.loads(raw)["choices"][0]["message"]["content"]
        except Exception:
            raise ValueError("Unexpected reply: " + raw[:400])
        try:
            out = json.loads(out[out.find("{"):out.rfind("}") + 1])
        except Exception:
            raise ValueError("Model text: " + out[:400])
        h, j = out["headline"].strip(), out["joke"].strip()
        if h and j and len(h) <= 90 and len(j) <= 90:
            return h, j
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
