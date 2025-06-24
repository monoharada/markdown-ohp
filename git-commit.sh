#!/bin/bash
cd /Users/haradaaya/dev/markdown-ohp
echo "=== Git Status ==="
git status
echo -e "\n=== Git Diff Cached ==="
git diff --cached
echo -e "\n=== Git Log ==="
git log -n 3 --oneline