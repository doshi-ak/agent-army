#!/usr/bin/env python3
"""Turn the 65 result artifacts into the auditable deliverable.

  python3 build_report.py <sandbox-root>

Writes results/REPORT.md, results/report.html and results/results.json. The
report is written for a third-party auditor: every cell links to the artifact
that proves it, and failures state exactly which assertion failed and why.
"""
import datetime
import html
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    sandbox = sys.argv[1]
    cases = json.load(open(os.path.join(HERE, "cases.json")))["cases"]
    conditions = json.load(open(os.path.join(HERE, "conditions.json")))["conditions"]
    criteria = json.load(open(os.path.join(HERE, "criteria.json")))["criteria"]
    cond_title = {c["id"]: c["title"] for c in conditions}
    crit_title = {c["id"]: c["title"] for c in criteria}
    crit_ids = [c["id"] for c in criteria]

    arts = {}
    for c in cases:
        p = os.path.join(sandbox, c["artifact"])
        arts[c["case_id"]] = json.load(open(p)) if os.path.exists(p) else None

    total = len(cases)
    npass = sum(1 for a in arts.values() if a and a["verdict"] == "PASS")
    nfail = sum(1 for a in arts.values() if a and a["verdict"] == "FAIL")
    nnr = total - npass - nfail
    cost = sum((a or {}).get("cost_usd") or 0 for a in arts.values())
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    done = (npass == total == 65)

    def mark(a):
        if a is None:
            return "—"
        return "PASS" if a["verdict"] == "PASS" else "FAIL"

    # ---------------- markdown ----------------
    md = [f"# Agent-Army Troubleshoot Skill — Validation & Testing Report",
          "",
          f"Generated {stamp}",
          "",
          f"**Definition of Done: {'MET' if done else 'NOT MET'}** — "
          f"{npass}/{total} cases passed, {nfail} failed, {nnr} not run.",
          f"Total measured run cost: ${cost:,.2f}.",
          "",
          "The matrix is 13 audit conditions × 5 testing criteria. Every cell has its own",
          "result artifact on disk; the Verdict column is computed from that artifact, never asserted.",
          "",
          "## Matrix",
          "",
          "| Condition | " + " | ".join(f"{cid} {crit_title[cid].split()[0]}" for cid in crit_ids) + " |",
          "|---|" + "---|" * len(crit_ids)]
    for cond in conditions:
        cells = [mark(arts.get(f"{cond['id']}-{cid}")) for cid in crit_ids]
        md.append(f"| **{cond['id']}** {cond_title[cond['id']]} | " + " | ".join(cells) + " |")

    md += ["", "## Criteria", ""]
    for c in criteria:
        md.append(f"- **{c['id']} {c['title']}** — {c['intent']}")

    md += ["", "## Case detail", ""]
    for c in cases:
        a = arts[c["case_id"]]
        if a is None:
            md += [f"### {c['case_id']} — NOT RUN", "", f"_{c['title']}_", ""]
            continue
        md += [f"### {c['case_id']} — {a['verdict']}", "",
               f"_{c['title']}_", "",
               f"Assertions passed: {a['assertions_passed']}/{a['assertions_total']}. "
               f"Artifact: `{c['artifact']}`.", ""]
        for r in a["assertions"]:
            md.append(f"- {'PASS' if r['passed'] else 'FAIL'} `{r['assertion']}` — {r['detail']}")
        md.append("")

    if not done:
        impacted = sorted({c["condition_id"] for c in cases
                           if arts.get(c["case_id"]) is None or arts[c["case_id"]]["verdict"] != "PASS"})
        md += ["## Hard Rule", "",
               "Any identified failure must be re-architected across every condition impacted by the",
               "failure model and re-run against all five testing criteria until the Definition of Done",
               "is satisfied for each condition.", "",
               f"Conditions impacted: {', '.join(impacted)}.",
               f"Cases queued for re-run: {len([c for c in cases if c['condition_id'] in impacted])} "
               "(see `results/rerun-queue.txt`).", ""]

    with open(os.path.join(sandbox, "results", "REPORT.md"), "w") as fh:
        fh.write("\n".join(md))

    # ---------------- html ----------------
    def cell_html(a):
        if a is None:
            return '<td class="nr">not run</td>'
        cls = "pass" if a["verdict"] == "PASS" else "fail"
        return f'<td class="{cls}">{a["verdict"]}<span>{a["assertions_passed"]}/{a["assertions_total"]}</span></td>'

    rows = ""
    for cond in conditions:
        cells = "".join(cell_html(arts.get(f"{cond['id']}-{cid}")) for cid in crit_ids)
        rows += (f'<tr><th><b>{cond["id"]}</b> {html.escape(cond_title[cond["id"]])}</th>{cells}</tr>')

    details = ""
    for c in cases:
        a = arts[c["case_id"]]
        if a is None:
            continue
        items = "".join(
            f'<li class="{"p" if r["passed"] else "f"}"><code>{html.escape(r["assertion"])}</code>'
            f'<span>{html.escape(str(r["detail"]))}</span></li>' for r in a["assertions"])
        details += (f'<details{" open" if a["verdict"] != "PASS" else ""}>'
                    f'<summary class="{"pass" if a["verdict"]=="PASS" else "fail"}">'
                    f'{c["case_id"]} — {a["verdict"]} '
                    f'<em>{html.escape(c["title"])}</em></summary><ul>{items}</ul></details>')

    hdr_cells = "".join(f"<th>{cid}<span>{html.escape(crit_title[cid])}</span></th>" for cid in crit_ids)
    status_cls = "ok" if done else "no"
    html_doc = f"""<!doctype html><meta charset="utf-8">
<title>Agent-Army Validation Report</title>
<style>
:root{{--bg:#0f1115;--fg:#e8e9ed;--mut:#8b90a0;--pass:#1f7a4d;--fail:#a32c3c;--line:#252936}}
*{{box-sizing:border-box}}
body{{margin:0;padding:2.5rem 1.5rem;background:var(--bg);color:var(--fg);
font:15px/1.55 ui-sans-serif,-apple-system,Segoe UI,Roboto,sans-serif}}
.wrap{{max-width:1080px;margin:0 auto}}
h1{{font-size:1.55rem;margin:0 0 .3rem;letter-spacing:-.01em}}
.sub{{color:var(--mut);margin:0 0 1.6rem}}
.banner{{padding:1rem 1.2rem;border-radius:10px;margin-bottom:1.8rem;border:1px solid var(--line)}}
.banner.ok{{background:#10281c;border-color:#1f7a4d}}
.banner.no{{background:#2a1418;border-color:#a32c3c}}
.banner b{{font-size:1.1rem}}
table{{width:100%;border-collapse:collapse;margin-bottom:2.2rem;font-size:13.5px}}
th,td{{border:1px solid var(--line);padding:.55rem .6rem;text-align:left;vertical-align:top}}
thead th{{background:#171a22;color:var(--mut);font-weight:600}}
thead th span{{display:block;font-weight:400;font-size:11px;opacity:.75}}
tbody th{{background:#141720;font-weight:500}}
td{{text-align:center;font-weight:600;font-size:12px}}
td span{{display:block;font-weight:400;opacity:.7;font-size:11px}}
td.pass{{background:#10281c;color:#5fd39b}}
td.fail{{background:#2a1418;color:#ff8b96}}
td.nr{{color:var(--mut);font-weight:400}}
details{{border:1px solid var(--line);border-radius:8px;margin-bottom:.5rem;background:#141720}}
summary{{cursor:pointer;padding:.6rem .8rem;font-weight:600}}
summary.pass{{color:#5fd39b}} summary.fail{{color:#ff8b96}}
summary em{{color:var(--mut);font-weight:400;font-style:normal}}
ul{{margin:0;padding:.2rem .8rem .8rem 1.6rem}}
li{{margin:.3rem 0}} li code{{color:var(--fg)}}
li span{{display:block;color:var(--mut);font-size:12.5px}}
li.p::marker{{color:#5fd39b}} li.f::marker{{color:#ff8b96}}
h2{{font-size:1.05rem;margin:2rem 0 .8rem;color:var(--mut);
text-transform:uppercase;letter-spacing:.06em}}
</style>
<div class="wrap">
<h1>Agent-Army Troubleshoot Skill — Validation &amp; Testing</h1>
<p class="sub">13 audit conditions × 5 testing criteria = 65 cases · generated {stamp}</p>
<div class="banner {status_cls}"><b>Definition of Done: {'MET' if done else 'NOT MET'}</b><br>
{npass}/{total} passed · {nfail} failed · {nnr} not run · ${cost:,.2f} measured run cost</div>
<h2>Matrix</h2>
<table><thead><tr><th>Condition</th>{hdr_cells}</tr></thead><tbody>{rows}</tbody></table>
<h2>Case detail</h2>
{details}
</div>"""
    with open(os.path.join(sandbox, "results", "report.html"), "w") as fh:
        fh.write(html_doc)

    with open(os.path.join(sandbox, "results", "results.json"), "w") as fh:
        json.dump({"generated_utc": stamp, "total": total, "passed": npass,
                   "failed": nfail, "not_run": nnr,
                   "definition_of_done_met": done,
                   "cost_usd": round(cost, 4),
                   "artifacts": {k: (v or {}).get("verdict", "NOT_RUN") for k, v in arts.items()}},
                  fh, indent=2)

    print(f"report: {npass}/{total} PASS -> results/REPORT.md, results/report.html, results/results.json")


if __name__ == "__main__":
    main()
