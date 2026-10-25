"""Daily refresh of the channel's video and subscriber counts on index.html."""
import re, sys, urllib.request

URL = "https://www.youtube.com/@BuggyGamesYT/about?hl=en&gl=US"
req = urllib.request.Request(URL, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": "CONSENT=YES+1; SOCS=CAI",
})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")

subs = re.search(r'"subscriberCountText":"([0-9.,KMB]+) subscribers?"', html)
vids = re.search(r'"videoCountText":"([0-9.,KMB]+) videos?"', html)
if not subs or not vids:
    print("Could not read counts from YouTube; leaving page unchanged.")
    sys.exit(0)
subs, vids = subs.group(1), vids.group(1)
print(f"Videos: {vids}  Subscribers: {subs}")

path = "index.html"
page = open(path, encoding="utf-8").read()
new = re.sub(r'(<span class="stat__fig">)[^<]*(</span><span class="stat__label">Videos</span>)', rf"\g<1>{vids}\g<2>", page)
new = re.sub(r'(<span class="stat__fig">)[^<]*(</span><span class="stat__label">Subscribers</span>)', rf"\g<1>{subs}\g<2>", new)
if new != page:
    open(path, "w", encoding="utf-8").write(new)
    print("index.html updated.")
else:
    print("No change.")
