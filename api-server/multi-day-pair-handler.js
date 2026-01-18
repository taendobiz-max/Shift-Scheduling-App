"use strict";
/**
 * Multi-Day Business Pair Handler (Fixed Version)
 *
 * Handles round-trip overnight bus operations where:
 * - Same employee(s) handle both outbound and return legs
 * - Galaxy team departs on odd dates, Aube team on even dates
 * - Supports both one-person and two-person operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBusinessPairs = detectBusinessPairs;
exports.assignMultiDayBusinessPairs = assignMultiDayBusinessPairs;
/**
 * Detect business pairs (outbound + return)
 */
function detectBusinessPairs(businesses) {
    var pairs = new Map();
    businesses.forEach(function (business) {
        var name = business.業務名 || business.business_name || '';
        var direction = business.方向 || business.direction || '';
        var duration = business.運行日数 || business.duration || 1;
        // Only process 2-day businesses
        if (duration !== 2)
            return;
        // Extract base name by removing direction suffix
        var baseName = name.replace(/[（(]往路[）)]/, '').replace(/[（(]復路[）)]/, '').trim();
        if (!pairs.has(baseName)) {
            pairs.set(baseName, {});
        }
        var pair = pairs.get(baseName);
        if (direction === 'outbound' || name.includes('往路')) {
            pair.outbound = business;
        }
        else if (direction === 'return' || name.includes('復路')) {
            pair.return = business;
        }
    });
    // Convert to array of complete pairs
    var completePairs = [];
    for (var _i = 0, _a = Array.from(pairs.entries()); _i < _a.length; _i++) {
        var _b = _a[_i], baseName = _b[0], pair = _b[1];
        if (pair.outbound && pair.return) {
            var requiredPeople = pair.outbound.必要人数 || pair.outbound.required_people || 1;
            completePairs.push({
                baseName: baseName,
                outbound: pair.outbound,
                return: pair.return,
                requiredPeople: requiredPeople
            });
        }
    }
    console.log("\uD83D\uDCCA Detected ".concat(completePairs.length, " business pairs"));
    completePairs.forEach(function (p) {
        console.log("  - ".concat(p.baseName, " (").concat(p.requiredPeople, "\u540D)"));
    });
    return completePairs;
}
/**
 * Determine which team departs on a given date
 * - Odd dates: Galaxy team departs
 * - Even dates: Aube team departs
 */
function getDepartingTeam(date) {
    var day = date.getDate();
    return day % 2 === 1 ? 'Galaxy' : 'Aube';
}
/**
 * Select employees for a round-trip operation
 */
function selectEmployeesForRoundTrip(employees, team, requiredPeople, businessGroup, usedEmployees) {
    var teamEmployees = employees.filter(function (emp) {
        var empId = emp.employee_id || emp.従業員id || '';
        var empTeam = emp.班 || emp.team || '';
        // Must be in the specified team and not already used
        // 「無し」の従業員はどちらのチームにも割り当て可能
        var isInTeam = empTeam === team || empTeam === '無し' || empTeam === '';
        return isInTeam && !usedEmployees.has(empId);
    });
    console.log("  \uD83D\uDD0D Available ".concat(team, " team members: ").concat(teamEmployees.length));
    if (teamEmployees.length < requiredPeople) {
        console.log("  \u26A0\uFE0F Not enough ".concat(team, " team members (need ").concat(requiredPeople, ", have ").concat(teamEmployees.length, ")"));
        return [];
    }
    // Select the required number of employees
    var selected = teamEmployees.slice(0, requiredPeople);
    // Mark as used
    selected.forEach(function (emp) {
        var empId = emp.employee_id || emp.従業員id || '';
        usedEmployees.add(empId);
    });
    return selected;
}
/**
 * Assign a business pair (round-trip) to employees
 */
function assignBusinessPair(pair, employees, startDate, usedEmployees, batchId) {
    var team = getDepartingTeam(startDate);
    console.log("\n\uD83D\uDCC5 ".concat(startDate.toISOString().split('T')[0], " - ").concat(pair.baseName));
    console.log("  \uD83D\uDE8C Departing team: ".concat(team));
    console.log("  \uD83D\uDC65 Required people: ".concat(pair.requiredPeople));
    // Select employees
    var selectedEmployees = selectEmployeesForRoundTrip(employees, team, pair.requiredPeople, pair.outbound.業務グループ || pair.outbound.business_group || '', usedEmployees);
    if (selectedEmployees.length === 0) {
        console.log("  \u274C No eligible employees found");
        return [];
    }
    console.log("  \u2705 Selected: ".concat(selectedEmployees.map(function (e) { return e.name || e.氏名 || e.従業員名; }).join(', ')));
    // Generate shifts for each employee
    var shifts = [];
    var pairSetId = "ROUNDTRIP_".concat(pair.baseName, "_").concat(startDate.toISOString().split('T')[0], "_").concat(team);
    selectedEmployees.forEach(function (employee) {
        var empId = employee.employee_id || employee.従業員id || '';
        // Day 1: Outbound (departure from Tokyo)
        var day1Shift = {
            date: startDate,
            employee_id: empId,
            business_name: pair.outbound.業務名 || pair.outbound.business_name,
            business_master_id: pair.outbound.業務id || pair.outbound.business_id,
            location: pair.outbound.営業所 || pair.outbound.location,
            multi_day_set_id: pairSetId,
            multi_day_info: {
                day: 1,
                total_days: 2,
                direction: 'outbound',
                team: team,
                pair_name: pair.baseName,
                required_people: pair.requiredPeople
            }
        };
        // Day 2: Return (arrival back to Tokyo)
        var day2Date = new Date(startDate);
        day2Date.setDate(day2Date.getDate() + 1);
        var day2Shift = {
            date: day2Date,
            employee_id: empId,
            business_name: pair.return.業務名 || pair.return.business_name,
            business_master_id: pair.return.業務id || pair.return.business_id,
            location: pair.return.営業所 || pair.return.location,
            multi_day_set_id: pairSetId,
            multi_day_info: {
                day: 2,
                total_days: 2,
                direction: 'return',
                team: team,
                pair_name: pair.baseName,
                required_people: pair.requiredPeople
            }
        };
        shifts.push(day1Shift, day2Shift);
    });
    console.log("  \uD83D\uDCDD Generated ".concat(shifts.length, " shifts (").concat(pair.requiredPeople, " employees \u00D7 2 days)"));
    return shifts;
}
/**
 * Main function to assign multi-day business pairs
 */
function assignMultiDayBusinessPairs(employees, businesses, dateRange, batchId) {
    console.log('\n🚀 Starting multi-day business pair assignment');
    console.log('🔍 DEBUG - dateRange.start type:', typeof dateRange.start, 'value:', dateRange.start);
    console.log('🔍 DEBUG - dateRange.end type:', typeof dateRange.end, 'value:', dateRange.end);
    // Convert string dates to Date objects if needed
    var startDate = typeof dateRange.start === 'string' ? new Date(dateRange.start) : dateRange.start;
    var endDate = typeof dateRange.end === 'string' ? new Date(dateRange.end) : dateRange.end;
    console.log('🔍 DEBUG - startDate:', startDate, 'isValid:', !isNaN(startDate.getTime()));
    console.log('🔍 DEBUG - endDate:', endDate, 'isValid:', !isNaN(endDate.getTime()));
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        console.log("\uD83D\uDCC5 Date range: ".concat(startDate.toISOString().split('T')[0], " to ").concat(endDate.toISOString().split('T')[0]));
    }
    else {
        console.error('❌ Invalid date range detected!');
        return [];
    }
    var pairs = detectBusinessPairs(businesses);
    // Update dateRange to use Date objects
    var normalizedDateRange = { start: startDate, end: endDate };
    if (pairs.length === 0) {
        console.log('⚠️ No business pairs detected');
        return [];
    }
    var allShifts = [];
    var usedEmployees = new Set();
    // Generate shifts for each day in the range
    var currentDate = new Date(normalizedDateRange.start);
    while (currentDate <= normalizedDateRange.end) {
        console.log("\n\uD83D\uDCC6 Processing date: ".concat(currentDate.toISOString().split('T')[0]));
        // For each business pair, try to assign
        pairs.forEach(function (pair) {
            var shifts = assignBusinessPair(pair, employees, new Date(currentDate), usedEmployees, batchId);
            allShifts.push.apply(allShifts, shifts);
        });
        // Move to next date
        currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log("\n\uD83C\uDF89 Multi-day generation complete: ".concat(allShifts.length, " total shifts"));
    return allShifts;
}
