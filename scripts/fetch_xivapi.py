#!/usr/bin/env python3
import sys, time, json, pathlib, argparse
import requests
import concurrent.futures as fut
from typing import Dict, Any, List

BASE = "https://xivapi.com"
SLEEP = 0.12  # polite delay per request

NAME_FIELDS = ["Name", "Name{Main}", "Singular"]

def get(url: str, params: Dict[str, Any] = None, tries=4, backoff=0.5):
    for i in range(tries):
        try:
            r = requests.get(url, params=params, timeout=60)
            r.raise_for_status()
            return r.json()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(backoff * (2 ** i))

def list_sheets(pin: str | None) -> List[str]:
    params = {}
    if pin:
        params["version"] = pin
    data = get(f"{BASE}/Content", params=params)
    return data if isinstance(data, list) else data.get("Results", [])

def fetch_page(sheet: str, page: int, pin: str | None):
    params = {"page": page, "language": "all"}  # important for combined dumps
    if pin:
        params["version"] = pin
    return get(f"{BASE}/{sheet}", params=params)

def dump_sheet(sheet: str, out_dir: pathlib.Path, pin: str | None):
    out_file = out_dir / f"{sheet}.jsonl"
    page = 1
    while True:
        data = fetch_page(sheet, page, pin)
        results = data.get("Results", [])
        if results:
            with open(out_file, "a", encoding="utf-8") as f:
                for row in results:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
        if not data.get("Pagination", {}).get("PageNext"):
            break
        page += 1
        time.sleep(SLEEP)

def read_rows(file: pathlib.Path):
    if file.suffix == ".jsonl":
        with open(file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except Exception:
                    continue
    elif file.suffix == ".json":
        with open(file, encoding="utf-8") as f:
            try:
                data = json.load(f)
            except Exception:
                return
            if isinstance(data, dict) and "Results" in data:
                for row in data["Results"]:
                    yield row
            elif isinstance(data, list):
                for row in data:
                    yield row

def pick_name(row: Dict[str, Any]) -> str | None:
    """
    Try to extract a usable name field.
    Handles both split-language dumps (only 'Name') and
    combined dumps with Name_en/Name_de/Name_fr.
    """
    # combined dumps → keys like Name_en
    for base in NAME_FIELDS:
        for lang in ("en", "de", "fr"):
            key = f"{base}_{lang}"
            if key in row:
                val = row.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip()

    # split dumps → just 'Name' / 'Singular' etc.
    for base in NAME_FIELDS:
        val = row.get(base)
        if isinstance(val, str) and val.strip():
            return val.strip()

    return None

def build_dictionary(out_dir: pathlib.Path, dict_out: pathlib.Path):
    dictionary = []
    seen = set()
    count = 0

    # Detect if we have split-language dumps
    en_dir = out_dir / "en"
    de_dir = out_dir / "de"
    fr_dir = out_dir / "fr"
    split_mode = en_dir.is_dir() and de_dir.is_dir() and fr_dir.is_dir()

    if split_mode:
        print("🔎 Detected split-language dump (en/de/fr subfolders). Merging by ID...")

        def files_by_basename(root: pathlib.Path) -> dict[str, pathlib.Path]:
            d = {}
            for p in root.rglob("*.jsonl"):
                d[p.name] = p
            for p in root.rglob("*.json"):
                d[p.name] = p
            return d

        en_files = files_by_basename(en_dir)
        de_files = files_by_basename(de_dir)
        fr_files = files_by_basename(fr_dir)

        all_basenames = set().union(en_files.keys(), de_files.keys(), fr_files.keys())

        for base in sorted(all_basenames):
            rows: dict[int, dict[str, str]] = {}

            def merge_lang(lang: str, path: pathlib.Path | None):
                if not path or not path.exists():
                    return
                for row in read_rows(path):
                    if not isinstance(row, dict):
                        continue
                    _id = row.get("ID")
                    if not isinstance(_id, int):
                        continue
                    name = pick_name(row)
                    if not name:
                        continue
                    slot = rows.setdefault(_id, {})
                    slot[lang] = name

            merge_lang("en", en_files.get(base))
            merge_lang("de", de_files.get(base))
            merge_lang("fr", fr_files.get(base))

            for _id, slot in rows.items():
                en = slot.get("en", "")
                de = slot.get("de", "")
                fr = slot.get("fr", "")
                if not (en or de or fr):
                    continue
                key = (en.lower(), de.lower(), fr.lower())
                if key in seen:
                    continue
                seen.add(key)
                dictionary.append({"en": en or de or fr, "de": de or en or fr, "fr": fr or en or de})
                count += 1

        print(f"✅ Merged split-language dumps into {count} unique entries")

    else:
        print("🔎 Detected combined dump (single folder). Reading Name_en/de/fr...")

        for file in out_dir.rglob("*.jsonl"):
            for row in read_rows(file):
                if not isinstance(row, dict):
                    continue
                en = (row.get("Name_en") or row.get("Name{Main}_en") or row.get("Singular_en") or "").strip()
                de = (row.get("Name_de") or row.get("Name{Main}_de") or row.get("Singular_de") or "").strip()
                fr = (row.get("Name_fr") or row.get("Name{Main}_fr") or row.get("Singular_fr") or "").strip()
                if not (en or de or fr):
                    continue
                key = (en.lower(), de.lower(), fr.lower())
                if key in seen:
                    continue
                seen.add(key)
                dictionary.append({"en": en or de or fr, "de": de or en or fr, "fr": fr or en or de})
                count += 1

        print(f"✅ Parsed combined dumps into {count} unique entries")

    dict_out.parent.mkdir(parents=True, exist_ok=True)
    with open(dict_out, "w", encoding="utf-8") as f:
        json.dump(dictionary, f, ensure_ascii=False, indent=2)

    print(f"🗂  dictionary.json written: {dict_out}  (total {len(dictionary)} entries)")

def crawl_all(out_dir: pathlib.Path, dict_out: pathlib.Path, pin: str | None, workers: int):
    print("Fetching sheet list...")
    sheets = list_sheets(pin)
    print(f"Found {len(sheets)} sheets.")

    out_dir.mkdir(parents=True, exist_ok=True)

    with fut.ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(dump_sheet, sheet, out_dir, pin) for sheet in sheets]
        for i, fu in enumerate(fut.as_completed(futures), 1):
            try:
                fu.result()
            except Exception as e:
                print(f"[WARN] {e}", file=sys.stderr)
            if i % 20 == 0:
                print(f"Progress: {i}/{len(sheets)} sheets dumped")

    print("Building dictionary.json...")
    build_dictionary(out_dir, dict_out)

def main():
    ap = argparse.ArgumentParser()
    root = pathlib.Path(__file__).resolve().parents[1]

    ap.add_argument("--out-dir", default=root / "data" / "full",
                    help="Folder for full sheet dumps")
    ap.add_argument("--dict-out", default=root / "public" / "dictionary.json",
                    help="Path for macro dictionary")
    ap.add_argument("--pin", default="7.31", help="Pin to XIVAPI version")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--skip-dump", action="store_true")

    args = ap.parse_args()

    out_dir = pathlib.Path(args.out_dir)
    dict_out = pathlib.Path(args.dict_out)

    if args.skip_dump:
        print("Skipping full dump, building dictionary from existing data...")
        build_dictionary(out_dir, dict_out)
    else:
        crawl_all(out_dir, dict_out, args.pin, args.workers)

if __name__ == "__main__":
    main()
