const { sql, poolPromise } = require("../config/db");


// ======================================================
// GET ALL ROOMS
// ======================================================

const getAllRooms = async () => {

    const pool = await poolPromise;

    const result = await pool.request().query(`
        SELECT
            RoomId,
            CampusId,
            RoomNumber,
            RoomName,
            RoomType,
            Capacity,
            BuildingName,
            FloorNumber,
            IsLab,
            IsActive,
            CreatedAt
        FROM Rooms
        ORDER BY RoomId
    `);

    return result.recordset;
};


// ======================================================
// GET ROOM BY ID
// ======================================================

const getRoomById = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "RoomId",
            sql.Int,
            Number(id)
        )
        .query(`
            SELECT
                RoomId,
                CampusId,
                RoomNumber,
                RoomName,
                RoomType,
                Capacity,
                BuildingName,
                FloorNumber,
                IsLab,
                IsActive,
                CreatedAt
            FROM Rooms
            WHERE RoomId = @RoomId
        `);

    return result.recordset[0];
};


// ======================================================
// CHECK DUPLICATE ROOM NUMBER
// ======================================================

const getRoomByNumber = async (
    campusId,
    roomNumber,
    excludeRoomId = null
) => {

    const pool = await poolPromise;

    const request = pool.request()
        .input(
            "CampusId",
            sql.Int,
            Number(campusId)
        )
        .input(
            "RoomNumber",
            sql.NVarChar(30),
            roomNumber
        );


    let query = `
        SELECT
            RoomId,
            CampusId,
            RoomNumber
        FROM Rooms
        WHERE CampusId = @CampusId
          AND RoomNumber = @RoomNumber
    `;


    if (excludeRoomId !== null) {

        request.input(
            "ExcludeRoomId",
            sql.Int,
            Number(excludeRoomId)
        );

        query += `
            AND RoomId <> @ExcludeRoomId
        `;
    }


    const result =
        await request.query(query);

    return result.recordset[0];
};


// ======================================================
// CREATE ROOM
// ======================================================

const createRoom = async (room) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "CampusId",
            sql.Int,
            room.CampusId
        )

        .input(
            "RoomNumber",
            sql.NVarChar(30),
            room.RoomNumber
        )

        .input(
            "RoomName",
            sql.NVarChar(100),
            room.RoomName || null
        )

        .input(
            "RoomType",
            sql.NVarChar(30),
            room.RoomType
        )

        .input(
            "Capacity",
            sql.Int,
            room.Capacity
        )

        .input(
            "BuildingName",
            sql.NVarChar(100),
            room.BuildingName || null
        )

        .input(
            "FloorNumber",
            sql.Int,
            room.FloorNumber ?? null
        )

        .input(
            "IsLab",
            sql.Bit,
            room.IsLab
        )

        .input(
            "IsActive",
            sql.Bit,
            room.IsActive
        )

        .query(`
            INSERT INTO Rooms
            (
                CampusId,
                RoomNumber,
                RoomName,
                RoomType,
                Capacity,
                BuildingName,
                FloorNumber,
                IsLab,
                IsActive,
                CreatedAt
            )
            OUTPUT INSERTED.RoomId
            VALUES
            (
                @CampusId,
                @RoomNumber,
                @RoomName,
                @RoomType,
                @Capacity,
                @BuildingName,
                @FloorNumber,
                @IsLab,
                @IsActive,
                SYSDATETIME()
            );
        `);

    return result.recordset[0];
};


// ======================================================
// UPDATE ROOM
// ======================================================

const updateRoom = async (id, room) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "RoomId",
            sql.Int,
            Number(id)
        )

        .input(
            "CampusId",
            sql.Int,
            room.CampusId
        )

        .input(
            "RoomNumber",
            sql.NVarChar(30),
            room.RoomNumber
        )

        .input(
            "RoomName",
            sql.NVarChar(100),
            room.RoomName || null
        )

        .input(
            "RoomType",
            sql.NVarChar(30),
            room.RoomType
        )

        .input(
            "Capacity",
            sql.Int,
            room.Capacity
        )

        .input(
            "BuildingName",
            sql.NVarChar(100),
            room.BuildingName || null
        )

        .input(
            "FloorNumber",
            sql.Int,
            room.FloorNumber ?? null
        )

        .input(
            "IsLab",
            sql.Bit,
            room.IsLab
        )

        .input(
            "IsActive",
            sql.Bit,
            room.IsActive
        )

        .query(`
            UPDATE Rooms
            SET
                CampusId = @CampusId,
                RoomNumber = @RoomNumber,
                RoomName = @RoomName,
                RoomType = @RoomType,
                Capacity = @Capacity,
                BuildingName = @BuildingName,
                FloorNumber = @FloorNumber,
                IsLab = @IsLab,
                IsActive = @IsActive
            WHERE RoomId = @RoomId
        `);

    return result.rowsAffected[0];
};


// ======================================================
// DELETE ROOM
// ======================================================

const deleteRoom = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "RoomId",
            sql.Int,
            Number(id)
        )
        .query(`
            DELETE FROM Rooms
            WHERE RoomId = @RoomId
        `);

    return result.rowsAffected[0];
};


// ======================================================
// DEACTIVATE ROOM
// ======================================================

const deactivateRoom = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "RoomId",
            sql.Int,
            Number(id)
        )
        .query(`
            UPDATE Rooms
            SET IsActive = 0
            WHERE RoomId = @RoomId
        `);

    return result.rowsAffected[0];
};


module.exports = {

    getAllRooms,

    getRoomById,

    getRoomByNumber,

    createRoom,

    updateRoom,

    deleteRoom,

    deactivateRoom
};