"""Answer website chat questions from the academy's own question-and-answer list.

The admin edits the list in the Admin Dashboard. A question is matched by
its words against each entry's keywords and question; when nothing fits,
the visitor is pointed to WhatsApp instead of being given a made-up answer.
"""

import re
import unicodedata

WHATSAPP_NUMBER = "+232 72 057646"

STOPWORDS = {
    # English
    "a", "an", "the", "is", "are", "am", "do", "does", "did", "i", "you", "we", "your", "our", "my", "me",
    "to", "of", "in", "on", "for", "and", "or", "it", "can", "how", "what", "which", "who", "there", "be",
    "with", "at", "this", "that", "have", "has", "will", "would", "please", "about", "any", "get",
    # Spanish
    "el", "la", "los", "las", "un", "una", "de", "del", "y", "o", "en", "es", "son", "que", "como", "cual",
    "por", "para", "con", "mi", "tu", "su", "se", "lo", "le", "hay", "puedo", "al", "me", "te", "nos",
}
GREETINGS = {"hi", "hello", "hey", "hola", "buenas", "buenos", "dias", "tardes", "good", "morning", "afternoon", "evening"}


def words(text: str) -> list[str]:
    plain = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode().lower()
    return [w for w in re.findall(r"[a-z0-9]+", plain) if w not in STOPWORDS]


def _similar(a: str, b: str) -> bool:
    """Same word, or one is a longer form of the other (enrol / enrolment)."""
    return a == b or (min(len(a), len(b)) >= 4 and (a.startswith(b) or b.startswith(a)))


def score(query_words: list[str], faq) -> int:
    """3 points per keyword the visitor used, 2 per word shared with the question.
    One shared question word alone ("teach") is not enough to count as a match,
    unless the question is a single word ("Fees?")."""
    keywords = words((faq.keywords or "").replace(",", " "))
    question = words(faq.question)
    keyword_hits = question_hits = 0
    for word in set(query_words):
        if any(_similar(word, k) for k in keywords):
            keyword_hits += 1
        elif any(_similar(word, q) for q in question):
            question_hits += 1
    if not keyword_hits and question_hits < min(2, len(set(question))):
        return 0
    return 3 * keyword_hits + 2 * question_hits


def best_answer(message: str, faqs: list) -> str | None:
    query = words(message)
    if not query:
        return None
    ranked = sorted(((score(query, faq), -faq.id, faq) for faq in faqs), key=lambda item: item[:2], reverse=True)
    if ranked and ranked[0][0] > 0:
        return ranked[0][2].answer
    return None


def is_greeting(message: str) -> bool:
    query = words(message)
    return bool(query) and all(word in GREETINGS for word in query)


def greeting(lang: str) -> str:
    if lang == "es":
        return "¡Hola! Pregúntame sobre los niveles, los horarios, los certificados, los precios o cómo inscribirte."
    return "Hello! Ask me about our levels, class times, certificates, fees or how to sign up."


def no_answer(lang: str) -> str:
    if lang == "es":
        return f"No tengo una respuesta segura para eso. Escribe a nuestro equipo por WhatsApp ({WHATSAPP_NUMBER}) y te ayudarán."
    return f"I don't have a reliable answer to that one. Please message our team on WhatsApp ({WHATSAPP_NUMBER}) and they'll help you."
