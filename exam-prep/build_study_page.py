"""Build exam-prep/study.html (a single readable study page) from the Markdown parts.

Run: python3 exam-prep/build_study_page.py
Each Markdown file listed in PARTS becomes one tab. Parts whose file doesn't exist yet are skipped.
"""
import html
import re
from pathlib import Path

import markdown

HERE = Path(__file__).parent

# (anchor, tab label, file)
PARTS = [
    ("start", "Start here", "00-README-index.md"),
    ("safety", "1 · Safety", "03-guide-sec1-safety.md"),
    ("materials", "2 · Prep & Materials", "04-guide-sec2-prep-materials.md"),
    ("steep", "3 · Steep-Slope", "05-guide-sec3-steep-slope.md"),
    ("lowslope", "4 · Low-Slope", "06-guide-sec4-low-slope.md"),
    ("rules", "5 · Rules & Business", "07-guide-sec5-rules-business.md"),
    ("nonres", "6 · Non-Residential", "08-guide-sec6-non-residential.md"),
    ("scores", "Score sheet", "13-score-sheets.md"),
    ("schedule", "Schedule", "14-study-schedule.md"),
    ("blueprint", "Exam blueprint", "01-source-audit-and-blueprint.md"),
    ("diagnosis", "Why I missed", "02-diagnosis-why-practice-tests-failed.md"),
]


def render(md_text: str) -> str:
    # Keep back-to-back "> **LABEL**" boxes as separate callouts (Markdown would merge them).
    md_text = re.sub(r"\n\n(?=> \*\*)", "\n\n<!-- box -->\n\n", md_text)
    # Python-Markdown needs a blank line before a list that follows a paragraph line.
    md_text = re.sub(r"(?m)^((?![-*] |\d+\. |>|\||\s*$).+)\n(?=(?:[-*] |\d+\. ))", "\\1\n\n", md_text)
    body = markdown.markdown(md_text, extensions=["tables", "sane_lists"])
    body = body.replace("<table>", '<div class="tablewrap"><table>').replace("</table>", "</table></div>")

    def callout(m):
        inner = m.group(1)
        kind = "note"
        if "WHAT TO MEMORIZE" in inner:
            kind = "memorize"
        elif "HOW TO REASON" in inner:
            kind = "reason"
        elif "Caution" in inner or "warning" in inner.lower():
            kind = "caution"
        return f'<aside class="callout {kind}">{inner}</aside>'

    body = re.sub(r"<blockquote>(.*?)</blockquote>", callout, body, flags=re.S)
    return body


def main():
    tabs, panels = [], []
    for anchor, label, fname in PARTS:
        path = HERE / fname
        if not path.exists():
            continue
        tabs.append(
            f'<button class="tab" role="tab" id="tab-{anchor}" data-target="{anchor}" '
            f'aria-controls="{anchor}">{html.escape(label)}</button>'
        )
        panels.append(
            f'<section class="panel" role="tabpanel" id="{anchor}" aria-labelledby="tab-{anchor}">'
            f"{render(path.read_text())}</section>"
        )
    # Interactive practice-exam tab (built from mocks.json by build_mocks.py)
    mocks = HERE / "mocks.json"
    if mocks.exists():
        tabs.insert(1, '<button class="tab" role="tab" id="tab-practice" data-target="practice" '
                       'aria-controls="practice">Practice exams</button>')
        panels.insert(1, (HERE / "practice_panel.html").read_text())
        data = mocks.read_text().replace("</", "<\\/")
        panels.append(f'<script type="application/json" id="mockdata">{data}</script>')
    template = (HERE / "study_template.html").read_text()
    out = template.replace("<!--TABS-->", "\n".join(tabs)).replace("<!--PANELS-->", "\n".join(panels))
    (HERE / "study.html").write_text(out)
    print(f"Wrote study.html with {len(panels)} parts")


if __name__ == "__main__":
    main()
