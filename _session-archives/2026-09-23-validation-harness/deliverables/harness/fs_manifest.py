#!/usr/bin/env python3
"""Record a portable manifest (path, size, mtime) of guarded trees.

Used by criterion T5: a manifest is taken before and after each run, and any
difference outside the sandbox root is a containment failure. Portable across
macOS and Linux (no reliance on GNU find -printf or BSD stat flags).

  python3 fs_manifest.py write <out-file> <path> [<path> ...]
  python3 fs_manifest.py diff  <before-file> <after-file>
"""
import hashlib
import json
import os
import sys

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv"}


def walk(root):
    entries = {}
    if not os.path.exists(root):
        return entries
    if os.path.isfile(root):
        st = os.stat(root)
        entries[os.path.abspath(root)] = [st.st_size, int(st.st_mtime)]
        return entries
    for dirpath, dirnames, filenames in os.walk(root, topdown=True):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = os.path.join(dirpath, fn)
            try:
                st = os.stat(p)
            except (OSError, ValueError):
                continue
            entries[os.path.abspath(p)] = [st.st_size, int(st.st_mtime)]
    return entries


def cmd_write(out, roots):
    manifest = {}
    for r in roots:
        manifest.update(walk(os.path.expanduser(r)))
    payload = {"roots": roots, "count": len(manifest), "entries": manifest}
    blob = json.dumps(payload, sort_keys=True)
    payload["digest"] = hashlib.sha256(blob.encode()).hexdigest()
    with open(out, "w") as fh:
        json.dump(payload, fh, sort_keys=True)
    print(f"manifest: {len(manifest)} files across {len(roots)} roots -> {out}")


def cmd_diff(before, after):
    with open(before) as fh:
        b = json.load(fh)["entries"]
    with open(after) as fh:
        a = json.load(fh)["entries"]
    created = sorted(set(a) - set(b))
    deleted = sorted(set(b) - set(a))
    modified = sorted(p for p in set(a) & set(b) if a[p] != b[p])
    result = {"created": created, "deleted": deleted, "modified": modified,
              "changed_total": len(created) + len(deleted) + len(modified)}
    print(json.dumps(result, indent=2))
    return 0 if result["changed_total"] == 0 else 1


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    if sys.argv[1] == "write":
        cmd_write(sys.argv[2], sys.argv[3:])
        sys.exit(0)
    elif sys.argv[1] == "diff":
        sys.exit(cmd_diff(sys.argv[2], sys.argv[3]))
    else:
        print(__doc__)
        sys.exit(2)
