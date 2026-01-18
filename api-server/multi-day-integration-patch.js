"use strict";
/**
 * Multi-Day Business Integration Patch (Fixed Version)
 *
 * Integrates round-trip multi-day business handling into the main shift generation flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessMultiDayBusinesses = preprocessMultiDayBusinesses;
exports.filterOutMultiDayBusinesses = filterOutMultiDayBusinesses;
var multi_day_pair_handler_1 = require("./multi-day-pair-handler");
/**
 * Pre-process multi-day businesses before main shift generation
 *
 * @returns Object containing:
 *   - multiDayShifts: Generated shifts for multi-day businesses
 *   - remainingBusinesses: Businesses that are not multi-day
 *   - remainingEmployees: Employees not assigned to multi-day businesses
 */
function preprocessMultiDayBusinesses(businesses, dates, employees, batchId, employeeSkillMatrix, location) {
    console.log('\n🔧 [MULTI-DAY PATCH] Pre-processing multi-day businesses');
    console.log('🔍 DEBUG - dates parameter:', JSON.stringify(dates));
    // Convert dates array to dateRange object
    // Handle both array of strings and array of objects
    var startDate;
    var endDate;
    if (dates && dates.length > 0 && typeof dates[0] === 'object' && dates[0] !== null && dates[0] && 'start' in dates[0]) {
        // dates is an array of {start, end} objects
        var firstDate = dates[0];
        var lastDate = dates[dates.length - 1];
        startDate = firstDate.start;
        endDate = lastDate.end || lastDate.start;
    }
    else {
        // dates is an array of date strings
        startDate = dates[0];
        endDate = dates[dates.length - 1];
    }
    console.log('🔍 DEBUG - startDate:', startDate, 'endDate:', endDate);
    var dateRange = {
        start: startDate,
        end: endDate
    };
    // Separate multi-day and single-day businesses
    var multiDayBusinesses = [];
    var singleDayBusinesses = [];
    businesses.forEach(function (business) {
        // Check both 業務タイプ and 運行日数 for multi-day detection
        var isMultiDayType = business.業務タイプ === 'multi_day';
        var duration = business.運行日数 || business.duration || 1;
        var isMultiDayDuration = Number(duration) === 2;
        console.log("\uD83D\uDD0D Business: ".concat(business.業務名, ", \u696D\u52D9\u30BF\u30A4\u30D7: ").concat(business.業務タイプ, ", \u904B\u884C\u65E5\u6570: ").concat(duration, " (type: ").concat(typeof duration, "), isMultiDay: ").concat(isMultiDayType || isMultiDayDuration));
        if (isMultiDayType || isMultiDayDuration) {
            multiDayBusinesses.push(business);
        }
        else {
            singleDayBusinesses.push(business);
        }
    });
    console.log("\uD83D\uDCCA Multi-day businesses: ".concat(multiDayBusinesses.length));
    console.log("\uD83D\uDCCA Single-day businesses: ".concat(singleDayBusinesses.length));
    if (multiDayBusinesses.length === 0) {
        console.log('⚠️ No multi-day businesses found, skipping multi-day processing');
        return {
            multiDayShifts: [],
            remainingBusinesses: businesses,
            remainingEmployees: employees,
            processedBusinessIds: new Set(),
            assignedEmployeesByDate: new Map()
        };
    }
    // Assign multi-day businesses
    var multiDayShifts = (0, multi_day_pair_handler_1.assignMultiDayBusinessPairs)(employees, multiDayBusinesses, dateRange, batchId);
    // Collect employee IDs that were assigned to multi-day businesses
    var assignedEmployeeIds = new Set();
    var assignedEmployeesByDate = new Map();
    multiDayShifts.forEach(function (shift) {
        if (shift.employee_id) {
            assignedEmployeeIds.add(shift.employee_id);
            // Track which employees are assigned on which dates
            var shiftDate = shift.date || shift.日付;
            if (shiftDate) {
                if (!assignedEmployeesByDate.has(shiftDate)) {
                    assignedEmployeesByDate.set(shiftDate, new Set());
                }
                assignedEmployeesByDate.get(shiftDate).add(shift.employee_id);
            }
        }
    });
    // Filter out assigned employees
    var remainingEmployees = employees.filter(function (emp) {
        var empId = emp.employee_id || emp.従業員id || '';
        return !assignedEmployeeIds.has(empId);
    });
    // Collect processed business IDs
    var processedBusinessIds = new Set();
    multiDayBusinesses.forEach(function (business) {
        var businessId = business.業務id || business.business_id || '';
        if (businessId) {
            processedBusinessIds.add(businessId);
        }
    });
    console.log("\n\uD83D\uDCCA [MULTI-DAY PATCH] Summary:");
    console.log("  \u2705 Multi-day shifts generated: ".concat(multiDayShifts.length));
    console.log("  \uD83D\uDC65 Employees assigned to multi-day: ".concat(assignedEmployeeIds.size));
    console.log("  \uD83D\uDC65 Remaining employees: ".concat(remainingEmployees.length));
    console.log("  \uD83D\uDCCB Remaining businesses: ".concat(singleDayBusinesses.length));
    return {
        multiDayShifts: multiDayShifts,
        remainingBusinesses: singleDayBusinesses,
        remainingEmployees: remainingEmployees,
        processedBusinessIds: processedBusinessIds,
        assignedEmployeesByDate: assignedEmployeesByDate
    };
}
/**
 * Filter out multi-day businesses from the business list
 *
 * @param businesses - All businesses
 * @param processedBusinessIds - Set of business IDs that have been processed as multi-day
 * @returns Filtered list of businesses excluding multi-day ones
 */
function filterOutMultiDayBusinesses(businesses, processedBusinessIds) {
    return businesses.filter(function (business) {
        var businessId = business.業務id || business.business_id || '';
        return !processedBusinessIds.has(businessId);
    });
}
