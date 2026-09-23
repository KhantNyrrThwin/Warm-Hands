"""Sentence assembly and grammar correction from Sign-Language-Translator.

Predicted glosses are capitalized, consecutive fingerspelled letters are
joined, then LanguageTool corrects the English sentence when it is
installed. Without Java, the same sentence is cleaned locally.
"""

from __future__ import annotations

import string

from sign_app.phrase import split_gloss

_tool = None
_tool_failed = False


def push_token(sentence: list[str], token: str, actions: set[str]) -> list[str]:
    """Append one prediction the way ``main.py`` builds a sentence."""
    sentence = list(sentence)
    sentence.append(token)
    if sentence:
        sentence[0] = sentence[0].capitalize()
    if len(sentence) < 2:
        return sentence
    last = sentence[-1]
    prev = sentence[-2]
    letter = string.ascii_lowercase + string.ascii_uppercase
    titled = {word.capitalize() for word in actions}
    if last in letter and (prev in letter or (prev not in actions and prev not in titled)):
        sentence[-1] = prev + last
        del sentence[-2]
        sentence[-1] = sentence[-1].capitalize()
    return sentence


def _local_cleanup(text: str) -> str:
    text = " ".join(text.split())
    if not text:
        return text
    text = text[0].upper() + text[1:]
    if text[-1] not in ".!?":
        text += "."
    return text


def _language_tool():
    global _tool, _tool_failed
    if _tool_failed:
        return None
    if _tool is not None:
        return _tool
    try:
        import language_tool_python

        # Local LanguageTool (needs Java). The public API used by the
        # original project is rate-limited, so the same correct() call
        # runs against a local server instead.
        _tool = language_tool_python.LanguageTool("en-US")
    except Exception:
        _tool_failed = True
        return None
    return _tool


def correct_text(text: str) -> str:
    text = " ".join(text.split())
    if not text:
        return text
    tool = _language_tool()
    if tool is not None:
        try:
            corrected = tool.correct(text)
            if corrected and corrected.strip():
                text = " ".join(corrected.split())
        except Exception:
            pass
    return _local_cleanup(text)


def correct_labels(labels: list[str]) -> str:
    """English sentence for a list of classifier gloss labels."""
    sentence: list[str] = []
    actions: set[str] = set()
    for label in labels:
        key, _body = split_gloss(label)
        word = key.replace("_", " ")
        actions.add(word)
        actions.add(key)
        sentence = push_token(sentence, word, actions)
    return correct_text(" ".join(sentence))
