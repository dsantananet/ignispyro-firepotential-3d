#!/bin/sh
set -eu
# Only additive static portal assets. No service restart, DB change, auth change or credentials.
portal=${1:?Pass the existing portal public directory}
delivery=${2:?Pass the new FirePotential delivery directory}
case "$portal" in /*/public) ;; *) echo 'Expected an absolute portal/public directory' >&2; exit 2;; esac
test -f "$portal/index.html"
test -f "$delivery/integration/firepotential-link.js"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$delivery/backups/$stamp"
mkdir -p "$backup"
if test -f "$portal/firepotential-link.js"; then cp -p "$portal/firepotential-link.js" "$backup/"; fi
cp "$delivery/integration/firepotential-link.js" "$portal/firepotential-link.js.new"
mv "$portal/firepotential-link.js.new" "$portal/firepotential-link.js"
for name in index.html simulator.html potential-view.html; do
 file="$portal/$name"
 if test -f "$file" && ! grep -q 'src="/firepotential-link.js"' "$file"; then
  cp -p "$file" "$backup/$name"
  sed 's#</body>#<script src="/firepotential-link.js" defer></script></body>#' "$file" > "$file.firepotential-new"
  grep -q 'src="/firepotential-link.js"' "$file.firepotential-new"
  mv "$file.firepotential-new" "$file"
 fi
done
echo "FirePotential index installed; backup=$backup; no restart performed."
