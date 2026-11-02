"""Local Myanmar sentence rules for the presentation's supported signs."""
import re

WORDS = {
    "i": "ကျွန်ုပ်", "sick": "နေမကောင်းပါ", "headache": "ခေါင်းကိုက်ပါ",
    "help": "ကူညီပါ", "please": "ကျေးဇူးပြု၍", "medicine": "ဆေး",
    "mingalarbar": "မင်္ဂလာပါ", "hello": "မင်္ဂလာပါ",
}


def gloss_key(label):
    text = str(label).strip()
    match = re.search(r"\(([^)]+)\)\s*$", text)
    return (match.group(1) if match else text).strip().lower().replace(" ", "_")


def correct_myanmar(labels):
    """Translate known labels, order subject first, and add Myanmar particles.

    These are deterministic rules for the small sign vocabulary, not a
    general-purpose grammar model. Unknown English labels are never echoed.
    """
    keys = []
    for label in labels:
        key = gloss_key(label)
        if key in WORDS and (not keys or keys[-1] != key):
            keys.append(key)
    if not keys:
        return ""
    # Apply subject and politeness to each clause between greetings.
    clauses = []
    pending = []

    def finish():
        if not pending:
            return
        subject = "ကျွန်ုပ်" if "i" in pending else ""
        polite = "ကျေးဇူးပြု၍ " if "please" in pending else ""
        predicates = [key for key in pending if key not in {"i", "please"}]
        if not predicates:
            clauses.append(subject + polite.rstrip())
        else:
            # A medicine request needs a request verb in natural Myanmar.
            parts = ["ဆေးပေးပါ" if key == "medicine" else WORDS[key] for key in predicates]
            if subject and predicates[0] in {"help", "medicine"}:
                subject += "ကို"
            clauses.append(polite + subject + "။ ".join(parts))
        pending.clear()

    for key in keys:
        if key in {"hello", "mingalarbar"}:
            finish()
            clauses.append(WORDS[key])
        else:
            pending.append(key)
    finish()
    return "။ ".join(clauses)
