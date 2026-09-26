const { sql, poolPromise } = require("../config/db");


// ======================================================
// GET ALL TIME SLOTS
// ======================================================

const getAllTimeSlots = async () => {

    const pool = await poolPromise;

    const result = await pool.request().query(`
        SELECT
            TimeSlotId,
            DayOfWeek,
            CONVERT(VARCHAR(8), StartTime, 108) AS StartTime,
            CONVERT(VARCHAR(8), EndTime, 108) AS EndTime,
            SlotName,
            IsActive
        FROM TimeSlots
        ORDER BY
            DayOfWeek,
            StartTime
    `);

    return result.recordset;
};


// ======================================================
// GET BY ID
// ======================================================

const getTimeSlotById = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "TimeSlotId",
            sql.Int,
            Number(id)
        )
        .query(`
            SELECT
                TimeSlotId,
                DayOfWeek,
                CONVERT(VARCHAR(8), StartTime, 108) AS StartTime,
                CONVERT(VARCHAR(8), EndTime, 108) AS EndTime,
                SlotName,
                IsActive
            FROM TimeSlots
            WHERE TimeSlotId = @TimeSlotId
        `);

    return result.recordset[0];
};


// ======================================================
// CHECK OVERLAPPING TIME SLOT
// ======================================================

const findOverlappingTimeSlot = async (
    dayOfWeek,
    startTime,
    endTime,
    excludeTimeSlotId = null
) => {

    const pool = await poolPromise;

    const request = pool.request()
        .input(
            "DayOfWeek",
            sql.TinyInt,
            dayOfWeek
        )
        .input(
            "StartTime",
            sql.VarChar(8),
            startTime
        )
        .input(
            "EndTime",
            sql.VarChar(8),
            endTime
        );


    let query = `
        SELECT TOP 1
            TimeSlotId,
            DayOfWeek,
            CONVERT(VARCHAR(8), StartTime, 108) AS StartTime,
            CONVERT(VARCHAR(8), EndTime, 108) AS EndTime,
            SlotName
        FROM TimeSlots
        WHERE
            DayOfWeek = @DayOfWeek
            AND CAST(@StartTime AS TIME(0)) < EndTime
            AND CAST(@EndTime AS TIME(0)) > StartTime
    `;


    if (excludeTimeSlotId !== null) {

        request.input(
            "ExcludeTimeSlotId",
            sql.Int,
            Number(excludeTimeSlotId)
        );

        query += `
            AND TimeSlotId <> @ExcludeTimeSlotId
        `;
    }


    const result =
        await request.query(query);

    return result.recordset[0];
};


// ======================================================
// CREATE
// ======================================================

const createTimeSlot = async (slot) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "DayOfWeek",
            sql.TinyInt,
            slot.DayOfWeek
        )

        .input(
            "StartTime",
            sql.VarChar(8),
            slot.StartTime
        )

        .input(
            "EndTime",
            sql.VarChar(8),
            slot.EndTime
        )

        .input(
            "SlotName",
            sql.NVarChar(50),
            slot.SlotName || null
        )

        .input(
            "IsActive",
            sql.Bit,
            slot.IsActive
        )

        .query(`
            INSERT INTO TimeSlots
            (
                DayOfWeek,
                StartTime,
                EndTime,
                SlotName,
                IsActive
            )
            OUTPUT INSERTED.TimeSlotId
            VALUES
            (
                @DayOfWeek,
                CAST(@StartTime AS TIME(0)),
                CAST(@EndTime AS TIME(0)),
                @SlotName,
                @IsActive
            );
        `);

    return result.recordset[0];
};


// ======================================================
// UPDATE
// ======================================================

const updateTimeSlot = async (
    id,
    slot
) => {

    const pool = await poolPromise;

    const result = await pool.request()

        .input(
            "TimeSlotId",
            sql.Int,
            Number(id)
        )

        .input(
            "DayOfWeek",
            sql.TinyInt,
            slot.DayOfWeek
        )

        .input(
            "StartTime",
            sql.VarChar(8),
            slot.StartTime
        )

        .input(
            "EndTime",
            sql.VarChar(8),
            slot.EndTime
        )

        .input(
            "SlotName",
            sql.NVarChar(50),
            slot.SlotName || null
        )

        .input(
            "IsActive",
            sql.Bit,
            slot.IsActive
        )

        .query(`
            UPDATE TimeSlots
            SET
                DayOfWeek = @DayOfWeek,
                StartTime =
                    CAST(@StartTime AS TIME(0)),
                EndTime =
                    CAST(@EndTime AS TIME(0)),
                SlotName = @SlotName,
                IsActive = @IsActive
            WHERE TimeSlotId = @TimeSlotId
        `);

    return result.rowsAffected[0];
};


// ======================================================
// HARD DELETE
// ======================================================

const deleteTimeSlot = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "TimeSlotId",
            sql.Int,
            Number(id)
        )
        .query(`
            DELETE FROM TimeSlots
            WHERE TimeSlotId = @TimeSlotId
        `);

    return result.rowsAffected[0];
};


// ======================================================
// DEACTIVATE
// ======================================================

const deactivateTimeSlot = async (id) => {

    const pool = await poolPromise;

    const result = await pool.request()
        .input(
            "TimeSlotId",
            sql.Int,
            Number(id)
        )
        .query(`
            UPDATE TimeSlots
            SET IsActive = 0
            WHERE TimeSlotId = @TimeSlotId
        `);

    return result.rowsAffected[0];
};


module.exports = {

    getAllTimeSlots,

    getTimeSlotById,

    findOverlappingTimeSlot,

    createTimeSlot,

    updateTimeSlot,

    deleteTimeSlot,

    deactivateTimeSlot
};