#!/usr/bin/env bash
# Stop the stack. --wipe also deletes all volumes (forces the ~1 h primary resync next time).
source "$(dirname "$0")/lib.sh"
require_stack_owner
if [ "${1:-}" = --wipe ]; then dc down -v --remove-orphans; rm -rf "$STATE"; pass "stack stopped and volumes wiped"
else dc down --remove-orphans; pass "stack stopped (volumes kept)"; fi
