"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createTimeSlotService } = require("../postgres/timeSlotService");

function fixture(rows = [{ TimeSlotId: 4 }]) {
  const calls = [];
  return { calls, async query(sql, args = []) {
    calls.push({ sql, args });
    return { rows, rowCount: rows.length };
  } };
}
test("time slot list returns formatted times and original property names", async () => {
  const db = fixture([{ TimeSlotId: 4, StartTime: "08:00:00", EndTime: "08:40:00" }]);
  const service = createTimeSlotService(db);
  const rows = await service.getAllTimeSlots();
  assert.equal(rows[0].StartTime, "08:00:00");
  assert.match(db.calls[0].sql, /to_char\("StartTime", 'HH24:MI:SS'\)/);
});
test("time slot creation binds values and returns generated ID", async () => {
  const db = fixture();
  const service = createTimeSlotService(db);
  assert.deepEqual(await service.createTimeSlot({
    DayOfWeek: 1, StartTime: "08:00", EndTime: "08:40", SlotName: "Period 1", IsActive: true
  }), { TimeSlotId: 4 });
  assert.deepEqual(db.calls[0].args, [1, "08:00:00", "08:40:00", "Period 1", 1]);
  assert.match(db.calls[0].sql, /RETURNING "TimeSlotId"/);
});
test("overlap lookup preserves strict interval semantics and excludes current ID", async () => {
  const db = fixture();
  const service = createTimeSlotService(db);
  await service.findOverlappingTimeSlot(3, "09:00", "10:00", 4);
  assert.match(db.calls[0].sql, /\$2::time < "EndTime"/);
  assert.match(db.calls[0].sql, /\$3::time > "StartTime"/);
  assert.match(db.calls[0].sql, /"TimeSlotId" <> \$4/);
  assert.deepEqual(db.calls[0].args, [3, "09:00:00", "10:00:00", 4]);
});
test("invalid time ranges and IDs are rejected before querying", async () => {
  const db = fixture();
  const service = createTimeSlotService(db);
  await assert.rejects(service.createTimeSlot({
    DayOfWeek: 8, StartTime: "08:00", EndTime: "09:00"
  }), TypeError);
  await assert.rejects(service.createTimeSlot({
    DayOfWeek: 2, StartTime: "10:00", EndTime: "09:00"
  }), TypeError);
  await assert.rejects(service.getTimeSlotById("not-an-id"), TypeError);
  assert.equal(db.calls.length, 0);
});
test("update, deletion and deactivation return row counts", async () => {
  const db = fixture();
  const service = createTimeSlotService(db);
  assert.equal(await service.updateTimeSlot(4, {
    DayOfWeek: 2, StartTime: "10:00", EndTime: "11:00", IsActive: false
  }), 1);
  assert.equal(await service.deactivateTimeSlot(4), 1);
  assert.equal(await service.deleteTimeSlot(4), 1);
});
