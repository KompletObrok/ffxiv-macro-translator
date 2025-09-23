#!/usr/bin/env python3
import json
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
dict_in = BASE_DIR / "public" / "dictionary.json"
dict_out = BASE_DIR / "public" / "dictionary.deduped.json"

def main():
    if not dict_in.exists():
        print(f"❌ Input file not found: {dict_in}")
        return

    with open(dict_in, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("❌ dictionary.json is not a flat list, aborting")
        return

    deduped = {}
    for entry in data:
        name = entry.get("en", "").strip().lower()
        if not name:
            continue
        if name not in deduped:
            deduped[name] = entry

    result = list(deduped.values())
    with open(dict_out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"✅ Deduplicated dictionary written to {dict_out} with {len(result)} unique entries")

if __name__ == "__main__":
    main()
