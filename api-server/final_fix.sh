#!/bin/bash
set -e

echo "🔧 Applying final fix: Move roll call from pairs to singles..."

# Backup
cp shiftGenerator.ts shiftGenerator.ts.backup_prefinal_$(date +%Y%m%d_%H%M%S)

# Find where pair businesses are identified
# We need to exclude roll call businesses from being classified as pairs

# Create a Python script to do the modification
python3 << 'EOFPYTHON'
import re

with open('shiftGenerator.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section where businesses are classified into pairs and singles
# Look for the pattern where pairBusinesses are identified

# The issue is likely in the business classification logic before PHASE 0
# We need to ensure roll call businesses are added to singleBusinesses, not pairBusinesses

# Find the line that identifies pair businesses
# Typically around "identifyPairBusinesses" or similar

# For now, let's add a check in the pair identification to exclude roll call
# Find the section that builds pairBusinesses

# Pattern to find: where businesses are being classified
pattern = r'(const pairBusinesses.*?=.*?\[.*?\];)'

if re.search(pattern, content, re.DOTALL):
    print("Found pair business classification")
else:
    print("Pattern not found, checking alternative patterns...")

# Alternative: find where businesses are filtered into pairs
# Look for the section before PHASE 0

# Save for inspection
with open('/tmp/shiftgen_inspection.txt', 'w') as f:
    # Find lines 400-530 (before PHASE 0)
    lines = content.split('\n')
    for i, line in enumerate(lines[400:530], start=401):
        f.write(f"{i}: {line}\n")

print("Saved lines 400-530 to /tmp/shiftgen_inspection.txt for inspection")

EOFPYTHON

echo "📄 Checking business classification logic..."
head -50 /tmp/shiftgen_inspection.txt

