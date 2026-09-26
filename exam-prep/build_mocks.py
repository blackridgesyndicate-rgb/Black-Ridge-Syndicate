"""Parse mock*.txt, validate them against the CTS blueprint, balance the answer key,
and write: mocks.json (for the study page) plus Markdown exam and key files.

Run: python3 exam-prep/build_mocks.py
"""
import json
import random
import re
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent
BLUEPRINT = {1: 25, 2: 20, 3: 35, 4: 15, 5: 20, 6: 15}
SECTION_NAMES = {
    1: "Safety & Employee Protection",
    2: "Roofing Preparation & Materials",
    3: "Steep-Slope Roofing Systems",
    4: "Low-Slope Roofing Systems",
    5: "Rules, Regulations & Business Practices",
    6: "Non-Residential Roofing Systems",
}
LETTERS = "ABCD"


def parse(path: Path):
    items = []
    for block in path.read_text().split("### Q")[1:]:
        q = {"keep": False, "opts": {}, "why": {}}
        for raw in block.strip().splitlines():
            line = raw.strip()
            if not line:
                continue
            if line == "KEEP":
                q["keep"] = True
                continue
            m = re.match(r"^(S|T|Q|A|B|C|D|ANS|EXP|WA|WB|WC|WD|SRC):\s?(.*)$", line)
            if not m:
                raise ValueError(f"{path.name}: unparsed line: {line!r}")
            key, val = m.groups()
            if key in LETTERS:
                q["opts"][key] = val
            elif key.startswith("W"):
                q["why"][key[1]] = val
            else:
                q[key] = val
        q["S"] = int(q["S"])
        if sorted(q["opts"]) != list(LETTERS):
            raise ValueError(f"{path.name}: item missing options: {q.get('Q')}")
        if q["ANS"] not in LETTERS:
            raise ValueError(f"{path.name}: bad answer: {q.get('Q')}")
        wrong = sorted(set(LETTERS) - {q["ANS"]})
        if sorted(q["why"]) != wrong:
            raise ValueError(f"{path.name}: wrong-option explanations must be exactly {wrong}: {q['Q'][:60]}")
        items.append(q)
    return items


def balance(items, seed):
    """Reorder options (except KEEP items) so each letter is correct about 25% of the time."""
    rng = random.Random(seed)
    counts = Counter(q["ANS"] for q in items if q["keep"])
    free = [q for q in items if not q["keep"]]
    total = len(items)
    target = {L: total // 4 + (1 if i < total % 4 else 0) for i, L in enumerate(LETTERS)}
    need = []
    for L in LETTERS:
        need += [L] * max(0, target[L] - counts[L])
    while len(need) < len(free):
        need.append(rng.choice(LETTERS))
    need = need[: len(free)]
    rng.shuffle(need)
    for q, pos in zip(free, need):
        correct_text = q["opts"][q["ANS"]]
        others = [(L, q["opts"][L], q["why"][L]) for L in LETTERS if L != q["ANS"]]
        rng.shuffle(others)
        new_opts, new_why = {}, {}
        it = iter(others)
        for L in LETTERS:
            if L == pos:
                new_opts[L] = correct_text
            else:
                _, text, why = next(it)
                new_opts[L] = text
                new_why[L] = why
        q["opts"], q["why"], q["ANS"] = new_opts, new_why, pos
    return items


def order(items):
    # Present in blueprint order (Section 1 → 6), keeping authored order within a section.
    return sorted(items, key=lambda q: q["S"])


def write_markdown(n, items):
    exam = [f"# Mock Exam {n} — 130 questions (original practice items, not CTS questions)\n",
            "Time yourself: **2 hours 30 minutes**. Choose the BEST answer. Record answers on a separate sheet, then score by section with the key.\n"]
    key = [f"# Mock Exam {n} — Answer Key with Explanations\n"]
    cur = None
    for i, q in enumerate(items, 1):
        if q["S"] != cur:
            cur = q["S"]
            exam.append(f"\n## Section {cur}: {SECTION_NAMES[cur]} ({BLUEPRINT[cur]} questions)\n")
            key.append(f"\n## Section {cur}: {SECTION_NAMES[cur]}\n")
        exam.append(f"**{i}.** {q['Q']}\n")
        for L in LETTERS:
            exam.append(f"- {L}. {q['opts'][L]}")
        exam.append("")
        key.append(f"**{i}. Answer: {q['ANS']}** — *{q['T']}*\n")
        key.append(f"{q['EXP']}\n")
        for L in LETTERS:
            if L != q["ANS"]:
                key.append(f"- **{L}** is wrong: {q['why'][L]}")
        key.append(f"\n*Source:* {q['SRC']}\n")
    (HERE / f"{9 + 2 * (n - 1):02d}-mock-exam-{n}.md").write_text("\n".join(exam) + "\n")
    (HERE / f"{10 + 2 * (n - 1):02d}-mock-exam-{n}-key.md").write_text("\n".join(key) + "\n")


def main():
    out = {}
    for n in (1, 2):
        path = HERE / f"mock{n}.txt"
        if not path.exists():
            continue
        items = parse(path)
        counts = Counter(q["S"] for q in items)
        report = ", ".join(f"S{s}: {counts[s]}/{BLUEPRINT[s]}" for s in BLUEPRINT)
        print(f"Mock {n}: {len(items)} items ({report})")
        items = order(balance(items, seed=1000 + n))
        dist = Counter(q["ANS"] for q in items)
        print(f"  answer distribution: {dict(sorted(dist.items()))}")
        write_markdown(n, items)
        out[f"mock{n}"] = [
            {"s": q["S"], "t": q["T"], "q": q["Q"], "o": [q["opts"][L] for L in LETTERS],
             "a": LETTERS.index(q["ANS"]), "e": q["EXP"],
             "w": {str(LETTERS.index(L)): q["why"][L] for L in q["why"]}, "src": q["SRC"]}
            for q in items
        ]
    out["sections"] = {str(k): {"name": v, "count": BLUEPRINT[k]} for k, v in SECTION_NAMES.items()}
    (HERE / "mocks.json").write_text(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
