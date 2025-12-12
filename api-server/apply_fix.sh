#!/bin/bash
set -e

echo "🔧 Applying PHASE 0 fix..."

# Backup
cp shiftGenerator.ts shiftGenerator.ts.backup_final_$(date +%Y%m%d_%H%M%S)

# Find the line number where PHASE 0 starts
PHASE0_START=$(grep -n "PHASE 0: Assign roll call businesses" shiftGenerator.ts | cut -d: -f1)

if [ -z "$PHASE0_START" ]; then
  echo "❌ PHASE 0 not found in shiftGenerator.ts"
  exit 1
fi

echo "📍 Found PHASE 0 at line $PHASE0_START"

# The issue is that roll call businesses are being processed as pair businesses
# We need to ensure PHASE 0 assigns multiple staff based on required_staff_count

# Check if the code already handles required_staff_count
if grep -q "for (let staffIndex = 0; staffIndex < requiredCount" shiftGenerator.ts; then
  echo "✅ required_staff_count loop already exists"
  echo "🔍 Checking if roll call businesses are excluded from pair processing..."
  
  # The problem might be that roll call businesses are still being added to pair businesses
  # Let's check the pair business logic
  
  if grep -A 5 "PHASE 1.*pair" shiftGenerator.ts | grep -q "点呼"; then
    echo "⚠️ Roll call businesses are being processed as pairs in PHASE 1"
    echo "🔧 Need to exclude roll call businesses from pair processing"
  fi
else
  echo "❌ required_staff_count loop not found in PHASE 0"
fi

# Show the current PHASE 0 implementation
echo ""
echo "=== Current PHASE 0 implementation (first 50 lines) ==="
sed -n "${PHASE0_START},$((PHASE0_START+50))p" shiftGenerator.ts

