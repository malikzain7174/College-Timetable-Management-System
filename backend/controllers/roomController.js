const roomService =
    require("../services/roomService");


// ======================================================
// BOOLEAN HELPER
// ======================================================

const parseBoolean = (
    value,
    defaultValue = false
) => {

    if (
        value === undefined ||
        value === null
    ) {
        return defaultValue;
    }

    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    );
};


// ======================================================
// GET ALL
// ======================================================

const getAllRooms = async (req, res) => {

    try {

        const rooms =
            await roomService.getAllRooms();

        return res.status(200).json(
            rooms
        );

    } catch (error) {

        console.error(
            "GET ROOMS ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to get rooms",
            error:
                error.message
        });
    }
};


// ======================================================
// GET BY ID
// ======================================================

const getRoomById = async (req, res) => {

    try {

        const roomId =
            Number(req.params.id);


        if (!Number.isInteger(roomId)) {

            return res.status(400).json({
                message:
                    "Invalid Room ID."
            });
        }


        const room =
            await roomService.getRoomById(
                roomId
            );


        if (!room) {

            return res.status(404).json({
                message:
                    "Room not found."
            });
        }


        return res.status(200).json(
            room
        );

    } catch (error) {

        console.error(
            "GET ROOM ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to get room",
            error:
                error.message
        });
    }
};


// ======================================================
// CREATE
// ======================================================

const createRoom = async (req, res) => {

    try {

        const {
            CampusId,
            RoomNumber,
            RoomName,
            RoomType,
            Capacity,
            BuildingName,
            FloorNumber,
            IsLab,
            IsActive
        } = req.body;


        const campusId =
            Number(CampusId);


        if (
            !Number.isInteger(campusId) ||
            campusId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Valid Campus ID is required."
            });
        }


        if (!RoomNumber?.trim()) {

            return res.status(400).json({
                message:
                    "Room Number is required."
            });
        }


        if (!RoomType?.trim()) {

            return res.status(400).json({
                message:
                    "Room Type is required."
            });
        }


        const capacity =
            Number(Capacity);


        if (
            !Number.isInteger(capacity) ||
            capacity <= 0
        ) {

            return res.status(400).json({
                message:
                    "Capacity must be greater than zero."
            });
        }


        let floorNumber = null;


        if (
            FloorNumber !== "" &&
            FloorNumber !== null &&
            FloorNumber !== undefined
        ) {

            floorNumber =
                Number(FloorNumber);


            if (
                !Number.isInteger(
                    floorNumber
                )
            ) {

                return res.status(400).json({
                    message:
                        "Floor Number must be a valid integer."
                });
            }
        }


        const duplicate =
            await roomService.getRoomByNumber(
                campusId,
                RoomNumber.trim()
            );


        if (duplicate) {

            return res.status(409).json({
                message:
                    "This Room Number already exists in the selected campus."
            });
        }


        const room =
            await roomService.createRoom({

                CampusId:
                    campusId,

                RoomNumber:
                    RoomNumber.trim(),

                RoomName:
                    RoomName?.trim() || null,

                RoomType:
                    RoomType.trim(),

                Capacity:
                    capacity,

                BuildingName:
                    BuildingName?.trim() || null,

                FloorNumber:
                    floorNumber,

                IsLab:
                    parseBoolean(
                        IsLab,
                        false
                    ),

                IsActive:
                    parseBoolean(
                        IsActive,
                        true
                    )
            });


        return res.status(201).json({

            message:
                "Room Added Successfully",

            room
        });


    } catch (error) {

        console.error(
            "CREATE ROOM ERROR:",
            error
        );


        if (error.number === 547) {

            return res.status(400).json({
                message:
                    "Invalid Campus ID."
            });
        }


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "Room Number already exists."
            });
        }


        return res.status(500).json({
            message:
                "Failed to create room",
            error:
                error.message
        });
    }
};


// ======================================================
// UPDATE
// ======================================================

const updateRoom = async (req, res) => {

    try {

        const roomId =
            Number(req.params.id);


        if (!Number.isInteger(roomId)) {

            return res.status(400).json({
                message:
                    "Invalid Room ID."
            });
        }


        const existing =
            await roomService.getRoomById(
                roomId
            );


        if (!existing) {

            return res.status(404).json({
                message:
                    "Room not found."
            });
        }


        const {
            CampusId,
            RoomNumber,
            RoomName,
            RoomType,
            Capacity,
            BuildingName,
            FloorNumber,
            IsLab,
            IsActive
        } = req.body;


        const campusId =
            Number(CampusId);


        if (
            !Number.isInteger(campusId) ||
            campusId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Valid Campus ID is required."
            });
        }


        if (!RoomNumber?.trim()) {

            return res.status(400).json({
                message:
                    "Room Number is required."
            });
        }


        if (!RoomType?.trim()) {

            return res.status(400).json({
                message:
                    "Room Type is required."
            });
        }


        const capacity =
            Number(Capacity);


        if (
            !Number.isInteger(capacity) ||
            capacity <= 0
        ) {

            return res.status(400).json({
                message:
                    "Capacity must be greater than zero."
            });
        }


        let floorNumber = null;


        if (
            FloorNumber !== "" &&
            FloorNumber !== null &&
            FloorNumber !== undefined
        ) {

            floorNumber =
                Number(FloorNumber);


            if (
                !Number.isInteger(
                    floorNumber
                )
            ) {

                return res.status(400).json({
                    message:
                        "Floor Number must be a valid integer."
                });
            }
        }


        const duplicate =
            await roomService.getRoomByNumber(
                campusId,
                RoomNumber.trim(),
                roomId
            );


        if (duplicate) {

            return res.status(409).json({
                message:
                    "This Room Number already exists in the selected campus."
            });
        }


        await roomService.updateRoom(
            roomId,
            {

                CampusId:
                    campusId,

                RoomNumber:
                    RoomNumber.trim(),

                RoomName:
                    RoomName?.trim() || null,

                RoomType:
                    RoomType.trim(),

                Capacity:
                    capacity,

                BuildingName:
                    BuildingName?.trim() || null,

                FloorNumber:
                    floorNumber,

                IsLab:
                    parseBoolean(
                        IsLab,
                        false
                    ),

                IsActive:
                    parseBoolean(
                        IsActive,
                        true
                    )
            }
        );


        return res.status(200).json({
            message:
                "Room Updated Successfully"
        });


    } catch (error) {

        console.error(
            "UPDATE ROOM ERROR:",
            error
        );


        if (error.number === 547) {

            return res.status(400).json({
                message:
                    "Invalid Campus ID."
            });
        }


        if (
            error.number === 2601 ||
            error.number === 2627
        ) {

            return res.status(409).json({
                message:
                    "Room Number already exists."
            });
        }


        return res.status(500).json({
            message:
                "Failed to update room",
            error:
                error.message
        });
    }
};


// ======================================================
// DELETE
// ======================================================

const deleteRoom = async (req, res) => {

    const roomId =
        Number(req.params.id);


    if (!Number.isInteger(roomId)) {

        return res.status(400).json({
            message:
                "Invalid Room ID."
        });
    }


    try {

        const existing =
            await roomService.getRoomById(
                roomId
            );


        if (!existing) {

            return res.status(404).json({
                message:
                    "Room not found."
            });
        }


        try {

            await roomService.deleteRoom(
                roomId
            );


            return res.status(200).json({
                message:
                    "Room Deleted Successfully"
            });


        } catch (deleteError) {


            // Foreign key means room is being used
            if (
                deleteError.number === 547
            ) {

                await roomService.deactivateRoom(
                    roomId
                );


                return res.status(200).json({

                    message:
                        "Room is already used in timetable or academic records, so it was deactivated instead of permanently deleted.",

                    deactivated:
                        true
                });
            }


            throw deleteError;
        }


    } catch (error) {

        console.error(
            "DELETE ROOM ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to delete room",
            error:
                error.message
        });
    }
};


module.exports = {

    getAllRooms,

    getRoomById,

    createRoom,

    updateRoom,

    deleteRoom
};