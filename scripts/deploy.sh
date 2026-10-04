#!/bin/sh
# Former remote deployment script is preserved in apps/docs/legacy/entrypoints.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
case "${1:---help}" in
  --build-container)
    [ "$#" -eq 1 ] || { echo 'Unexpected arguments.' >&2; exit 2; }
    docker build -t symindx-agent:0.2.0 .
    ;;
  --help)
    printf '%s\n' 'Usage: scripts/deploy.sh --build-container' 'Builds a local CLI image. No remote deployment is configured.' 'See apps/docs/modernization/TOOLING.md.'
    ;;
  *)
    echo 'No deployment target is configured. Use --build-container for a local image.' >&2
    exit 2
    ;;
esac
