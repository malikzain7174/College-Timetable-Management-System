"use strict";

const { getPgPool } = require("./client");
const columns = '"RoomId", "CampusId", "RoomNumber", "RoomName", "RoomType", "Capacity", "BuildingName", "FloorNumber", "IsLab", "IsActive", "CreatedAt"';
const flag = value => value ? 1 : 0;
const id = value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new TypeError("A positive numeric ID is required.");
  return number;
};
function values(room) {
  return [id(room.CampusId), room.RoomNumber, room.RoomName || null, room.RoomType,
    room.Capacity, room.BuildingName || null, room.FloorNumber ?? null,
    flag(room.IsLab), flag(room.IsActive)];
}

function createRoomService(pool = getPgPool()) {
  const getAllRooms = async () => (await pool.query(`SELECT ${columns} FROM "Rooms" ORDER BY "RoomId"`)).rows;
  const getRoomById = async roomId =>
    (await pool.query(`SELECT ${columns} FROM "Rooms" WHERE "RoomId" = $1`, [id(roomId)])).rows[0];
  const getRoomByNumber = async (campusId, roomNumber, excludeRoomId = null) => {
    const params = [id(campusId), roomNumber];
    let condition = "";
    if (excludeRoomId !== null) {
      params.push(id(excludeRoomId));
      condition = ' AND "RoomId" <> $3';
    }
    return (await pool.query(`
      SELECT "RoomId", "CampusId", "RoomNumber" FROM "Rooms"
      WHERE "CampusId" = $1 AND "RoomNumber" = $2${condition}
    `, params)).rows[0];
  };
  const createRoom = async room =>
    (await pool.query(`
      INSERT INTO "Rooms" ("CampusId", "RoomNumber", "RoomName", "RoomType", "Capacity",
        "BuildingName", "FloorNumber", "IsLab", "IsActive")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING "RoomId"
    `, values(room))).rows[0];
  const updateRoom = async (roomId, room) => (await pool.query(`
    UPDATE "Rooms" SET "CampusId" = $2, "RoomNumber" = $3, "RoomName" = $4,
      "RoomType" = $5, "Capacity" = $6, "BuildingName" = $7, "FloorNumber" = $8,
      "IsLab" = $9, "IsActive" = $10 WHERE "RoomId" = $1
  `, [id(roomId), ...values(room)])).rowCount;
  const deleteRoom = async roomId =>
    (await pool.query('DELETE FROM "Rooms" WHERE "RoomId" = $1', [id(roomId)])).rowCount;
  const deactivateRoom = async roomId =>
    (await pool.query('UPDATE "Rooms" SET "IsActive" = 0 WHERE "RoomId" = $1', [id(roomId)])).rowCount;
  return { getAllRooms, getRoomById, getRoomByNumber, createRoom, updateRoom, deleteRoom, deactivateRoom };
}
module.exports = { createRoomService };
