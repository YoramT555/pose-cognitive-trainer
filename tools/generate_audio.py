import asyncio
from pathlib import Path

import truststore

truststore.inject_into_ssl()
import edge_tts


ROOT = Path(__file__).resolve().parents[1] / "audio"
CONTENT = {
    "en": {
        "voice": "en-US-JennyNeural",
        "items": {
            **{f"number-{n}": word for n, word in enumerate(
                ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
            ) if n},
            "switchCommand": "Switch poses",
            "finished": "Finished",
        },
    },
    "he": {
        "voice": "he-IL-HilaNeural",
        "items": {
            **{f"number-{n}": word for n, word in enumerate(
                ["", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר"]
            ) if n},
            "switchCommand": "החליפו תנוחה",
            "finished": "הסתיים",
        },
    },
}


async def main():
    for language, config in CONTENT.items():
        target = ROOT / language
        target.mkdir(parents=True, exist_ok=True)
        for name, text in config["items"].items():
            await edge_tts.Communicate(text, config["voice"], rate="-8%").save(target / f"{name}.mp3")
            print(f"Created {language}/{name}.mp3")


if __name__ == "__main__":
    asyncio.run(main())
