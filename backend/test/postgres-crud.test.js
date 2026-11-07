"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createSubjectService } = require("../postgres/subjectService");
const { createRoomService } = require("../postgres/roomService");

function fakePool(returnRows = [{ SubjectId: 11, RoomId: 22 }]) {
  const calls = [];
  return { calls, async query(sql, values = []) {
    calls.push({ sql, values });
    return { rows: returnRows, rowCount: returnRows.length };
  } };
}

test("subjects: create returns inserted ID and binds user input", async () => {
  const pool = fakePool([{ SubjectId: 11 }]);
  const service = createSubjectService(pool);
  assert.deepEqual(await service.createSubject({
    SubjectCode: "O'Hara", SubjectName: "Database", CreditHours: 2.5,
    WeeklyHours: 3, IsPractical: true, IsActive: true
  }), { SubjectId: 11 });
  assert.match(pool.calls[0].sql, /RETURNING "SubjectId"/);
  assert.doesNotMatch(pool.calls[0].sql, /O'Hara/);
  assert.equal(pool.calls[0].values[0], "O'Hara");
  assert.deepEqual(pool.calls[0].values.slice(-2), [1, 1]);
});

test("subjects: list, fetch, update and delete keep existing return conventions", async () => {
  const pool = fakePool([{ SubjectId: 11 }]);
  const service = createSubjectService(pool);
  assert.equal((await service.getAllSubjects()).length, 1);
  assert.equal((await service.getSubjectById(11)).SubjectId, 11);
  assert.equal(await service.updateSubject(11, {
    SubjectCode: "CS", SubjectName: "Computer Science", CreditHours: null,
    WeeklyHours: 4, IsPractical: false, IsActive: true
  }), 1);
  assert.equal(await service.deleteSubject(11), 1);
  assert.deepEqual(pool.calls.at(-1).values, [11]);
  await assert.rejects(service.deleteSubject("invalid"), TypeError);
});

test("rooms: create binds values and returns ID", async () => {
  const pool = fakePool([{ RoomId: 22 }]);
  const service = createRoomService(pool);
  const room = {
    CampusId: 3, RoomNumber: "A-01", RoomName: "Hall", RoomType: "Classroom",
    Capacity: 40, FloorNumber: 1, IsLab: false, IsActive: true
  };
  assert.deepEqual(await service.createRoom(room), { RoomId: 22 });
  assert.deepEqual(pool.calls[0].values, [3, "A-01", "Hall", "Classroom", 40, null, 1, 0, 1]);
  assert.match(pool.calls[0].sql, /RETURNING "RoomId"/);
});

test("rooms: duplicates, update, deactivate and delete preserve semantics", async () => {
  const pool = fakePool([{ RoomId: 22 }]);
  const service = createRoomService(pool);
  const room = { CampusId: 3, RoomNumber: "A-01", RoomType: "Lab", Capacity: 20, IsLab: true, IsActive: false };
  await service.getRoomByNumber(3, "A-01", 22);
  assert.deepEqual(pool.calls[0].values, [3, "A-01", 22]);
  assert.match(pool.calls[0].sql, /"RoomId" <> \$3/);
  assert.equal(await service.updateRoom(22, room), 1);
  assert.deepEqual(pool.calls[1].values.slice(-2), [1, 0]);
  assert.equal(await service.deactivateRoom(22), 1);
  assert.equal(await service.deleteRoom(22), 1);
  await assert.rejects(service.getRoomById("DROP TABLE"), TypeError);
});
