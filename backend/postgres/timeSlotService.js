"use strict";

// Isolated PostgreSQL implementation. Not wired to Express until the
// remaining SQL Server services are migrated and end-to-end tests pass.
const { getPgPool } = require("./client");

const select = `SELECT "TimeSlotId", "DayOfWeek", to_char("StartTime", 'HH24:MI:SS') AS "StartTime",
  to_char("EndTime", 'HH24:MI:SS') AS "EndTime", "SlotName", "IsActive" FROM "TimeSlots"`;
const id = input => {
  const number = Number(input);
  if (!Number.isSafeInteger(number) || number < 1) throw new TypeError("A positive time slot ID is required.");
  return number;
};
const flag = value => value ? 1 : 0;
const validTime = value => {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    throw new TypeError("Time must be HH:mm or HH:mm:ss.");
  }
  return value.length === 5 ? value + ":00" : value;
};
const payload = slot => {
  const day = Number(slot.DayOfWeek);
  if (!Number.isInteger(day) || day < 1 || day > 7) throw new TypeError("DayOfWeek must be between 1 and 7.");
  const start = validTime(slot.StartTime), end = validTime(slot.EndTime);
  if (start >= end) throw new TypeError("EndTime must be after StartTime.");
  return [day, start, end, slot.SlotName || null, flag(slot.IsActive)];
};

function createTimeSlotService(pool = getPgPool()) {
  const getAllTimeSlots = async () =>
    (await pool.query(select + ' ORDER BY "DayOfWeek", "StartTime"')).rows;

  const getTimeSlotById = async timeSlotId =>
    (await pool.query(select + ' WHERE "TimeSlotId" = $1', [id(timeSlotId)])).rows[0];

  const findOverlappingTimeSlot = async (dayOfWeek, startTime, endTime, excludeTimeSlotId = null) => {
    const day = Number(dayOfWeek);
    if (!Number.isInteger(day) || day < 1 || day > 7) throw new TypeError("Invalid day.");
    const start = validTime(startTime), end = validTime(endTime);
    if (start >= end) throw new TypeError("EndTime must be after StartTime.");
    const args = [day, start, end];
    let excluded = "";
    if (excludeTimeSlotId !== null) {
      excluded = ' AND "TimeSlotId" <> $4';
      args.push(id(excludeTimeSlotId));
    }
    return (await pool.query(select + `
      WHERE "DayOfWeek" = $1
        AND $2::time < "EndTime"
        AND $3::time > "StartTime"` + excluded + ' LIMIT 1', args)).rows[0];
  };

  const createTimeSlot = async slot =>
    (await pool.query(`
      INSERT INTO "TimeSlots" ("DayOfWeek", "StartTime", "EndTime", "SlotName", "IsActive")
      VALUES ($1, $2::time, $3::time, $4, $5)
      RETURNING "TimeSlotId"
    `, payload(slot))).rows[0];

  const updateTimeSlot = async (timeSlotId, slot) =>
    (await pool.query(`
      UPDATE "TimeSlots" SET "DayOfWeek" = $2, "StartTime" = $3::time,
        "EndTime" = $4::time, "SlotName" = $5, "IsActive" = $6
      WHERE "TimeSlotId" = $1
    `, [id(timeSlotId), ...payload(slot)])).rowCount;

  const deleteTimeSlot = async timeSlotId =>
    (await pool.query('DELETE FROM "TimeSlots" WHERE "TimeSlotId" = $1', [id(timeSlotId)])).rowCount;

  const deactivateTimeSlot = async timeSlotId =>
    (await pool.query('UPDATE "TimeSlots" SET "IsActive" = 0 WHERE "TimeSlotId" = $1', [id(timeSlotId)])).rowCount;

  return {
    getAllTimeSlots, getTimeSlotById, findOverlappingTimeSlot,
    createTimeSlot, updateTimeSlot, deleteTimeSlot, deactivateTimeSlot
  };
}

module.exports = { createTimeSlotService };
