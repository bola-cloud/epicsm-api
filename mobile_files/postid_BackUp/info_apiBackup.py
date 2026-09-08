import io
import json
import re
import requests
import zstandard as zstd
from collections import Counter
from typing import Optional, Union

# ----------------- Core extractors -----------------
def _unescape_light(s: str) -> str:
    return (s.replace('\\/', '/')
             .replace('\\"', '"')
             .replace('\\\\', '\\'))

def _post_id_after_markers(text: str) -> Optional[str]:
    markers = [
        "CommentComposerGroupMentionsPlugin",
        "shareable_from_perspective_of_feed_ufi",
        "tracking",
    ]
    for mk in markers:
        i = text.lower().find(mk.lower())
        if i != -1:
            m_top = re.search(r'top_level_post_id[^0-9]{0,40}(\d{6,})', text[i:], flags=re.I | re.S)
            if m_top:
                return m_top.group(1)
            m_next = re.search(r'post_id[^0-9]{0,40}(\d{6,})', text[i:], flags=re.I | re.S)
            if m_next:
                return m_next.group(1)
    return None

def _extract_post_id_from_view(text: str) -> Optional[str]:
    m_top = re.search(r'top_level_post_id[^0-9]{0,40}(\d{6,})', text, flags=re.I | re.S)
    if m_top:
        return m_top.group(1)

    m_link = re.search(r'/permalink/(\d{6,})/?', text, flags=re.I)
    if m_link:
        return m_link.group(1)

    cands = re.findall(r'(?<!top_level_)post_id[^0-9]{0,40}(\d{6,})', text, flags=re.I | re.S)
    if cands:
        counts = Counter(cands).most_common()
        if len(counts) > 1 and counts[0][1] == counts[1][1]:
            for m in re.finditer(r'(?<!top_level_)post_id[^0-9]{0,40}(\d{6,})', text, flags=re.I | re.S):
                return m.group(1)
        return counts[0][0]

    m_after = _post_id_after_markers(text)
    if m_after:
        return m_after

    return None

def extract_post_id(text: str) -> Optional[str]:
    if not text:
        return None
    for view in (text, _unescape_light(text)):
        pid = _extract_post_id_from_view(view)
        if pid:
            return pid
    return None

def extract_actor_or_page_id(text: str) -> Optional[str]:
    def _one(view: str) -> Optional[str]:
        # Page / owner patterns (highest priority)
        for pat in (
            r'["\']page_id["\']\s*:\s*["\']?(\d+)["\']?',
            r'["\']pageID["\']\s*:\s*["\']?(\d+)["\']?',
            r'content_owner_id_new[^0-9]{0,40}(\d{6,})',
            r'["\']owner_id["\']\s*:\s*["\']?(\d+)["\']?',
            r'["\']timelineID["\']\s*:\s*["\']?(\d+)["\']?',
        ):
            m = re.search(pat, view, flags=re.I | re.S)
            if m:
                return m.group(1)
        return None

    for view in (text, _unescape_light(text)):
        v = _one(view)
        if v:
            return v
    return None


def extract_profile_id(text: str) -> Optional[str]:
    """
    Extract a personal profile / timeline user ID from a Facebook profile page.
    Tries multiple patterns found in FB's inline JSON (ServerJS / relay preloaders).
    Returns the first confident match, or None.
    """
    def _one(view: str) -> Optional[str]:
        patterns = [
            # Relay preloader variables: "userID":"1488815870"
            r'["\']userID["\']\s*:\s*["\'](\d{6,})["\']',
            # selectedID in profile header preloader
            r'["\']selectedID["\']\s*:\s*["\'](\d{6,})["\']',
            # actorID / actor_id (uncommented for profile pages)
            r'["\']actorID["\']\s*:\s*["\']?(\d{6,})["\']?',
            r'["\']actor_id["\']\s*:\s*["\']?(\d{6,})["\']?',
            # profile_id key
            r'["\']profile_id["\']\s*:\s*["\']?(\d{6,})["\']?',
            # fbIdentity block: "actorId":"100001851911500"
            r'["\']actorId["\']\s*:\s*["\'](\d{6,})["\']',
            # userId field in MessengerWebInitData and similar
            r'["\']userId["\']\s*:\s*(\d{6,})',
            # /profile.php?id=XXXXXX in page source
            r'profile\.php\?id=(\d{6,})',
            # "entity_id":"XXXXXX" pattern
            r'["\']entity_id["\']\s*:\s*["\']?(\d{6,})["\']?',
        ]
        for pat in patterns:
            m = re.search(pat, view, flags=re.I | re.S)
            if m:
                return m.group(1)
        return None

    for view in (text, _unescape_light(text)):
        v = _one(view)
        if v:
            return v
    return None

def extract_focus_comment_id(text: str) -> Optional[str]:
    m = re.search(r'["\']focusCommentID["\']\s*:\s*["\']?(\d+)["\']?', text, flags=re.I)
    return m.group(1) if m else None

# ----------------- Transport helpers -----------------
_ZSTD_MAGIC = b"\x28\xB5\x2F\xFD"

def _maybe_decode(resp: requests.Response) -> str:
    raw = resp.content
    enc = (resp.headers.get("content-encoding") or "").lower()
    if "zstd" in enc or raw.startswith(_ZSTD_MAGIC):
        try:
            d = zstd.ZstdDecompressor()
            with d.stream_reader(io.BytesIO(raw)) as r:
                chunks = []
                while True:
                    c = r.read(16384)
                    if not c:
                        break
                    chunks.append(c)
            return b"".join(chunks).decode("utf-8", errors="ignore")
        except Exception:
            pass
    return raw.decode("utf-8", errors="ignore")

# ----------------- Public API -----------------
def get_page_or_account_and_post(
    url: str,
    cookies: Union[str, dict, None] = None,
    only_owner: bool = False,
) -> dict:
    """
    Fetch a Facebook post or profile URL and extract available IDs.

    Returns a dict with keys:
      - "id"         : composite key  owner_id[_post_id[_comment_id]]
                       or profile_id when no post is found
      - "owner_id"   : page / actor ID (None if not found)
      - "profile_id" : personal profile ID (None if not found)
      - "post_id"    : post ID (None for plain profile pages)
      - "comment_id" : focused comment ID (None if absent)
      - "type"       : "post" | "profile" | "unknown"
    """
    headers = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-encoding": "gzip, deflate",
        "accept-language": "en-US,en;q=0.9",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    }

    # Convert cookie string into dict if provided
    cookie_dict = None
    if isinstance(cookies, str) and cookies.strip():
        cookie_dict = {}
        for part in cookies.split(";"):
            if "=" in part:
                k, v = part.strip().split("=", 1)
                cookie_dict[k.strip()] = v.strip()
    elif isinstance(cookies, dict):
        cookie_dict = cookies

    resp = requests.get(url, headers=headers, cookies=cookie_dict, timeout=30, allow_redirects=True)
    resp.raise_for_status()

    text = _maybe_decode(resp)

    post_id    = extract_post_id(text)
    owner_id   = extract_actor_or_page_id(text)
    profile_id = extract_profile_id(text)
    comment_id = extract_focus_comment_id(text)

    # Build composite "id" and detect page type
    if post_id and owner_id:
        page_type = "post"
        if comment_id:
            composite = f"{owner_id}_{post_id}_{comment_id}"
        else:
            composite = f"{owner_id}_{post_id}"
    elif profile_id:
        page_type = "profile"
        composite = profile_id
    elif owner_id:
        page_type = "profile"
        composite = owner_id
    else:
        page_type = "unknown"
        composite = None

    result = {
        "id":         composite,
        "owner_id":   owner_id,
        "profile_id": profile_id,
        "post_id":    post_id,
        "comment_id": comment_id,
        "type":       page_type,
    }

    # Legacy compat: only_owner returns just the owner/profile string
    if only_owner:
        return owner_id or profile_id

    return result