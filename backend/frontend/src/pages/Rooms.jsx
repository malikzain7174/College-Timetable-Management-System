 

import {
    useEffect,
    useState
} from "react";

import {
    getAllRooms,
    createRoom,
    updateRoom,
    deleteRoom
} from "../services/roomService";

import "./Rooms.css";


const initialFormData = {

    CampusId: "",

    RoomNumber: "",

    RoomName: "",

    RoomType: "",

    Capacity: "",

    BuildingName: "",

    FloorNumber: "",

    IsLab: false,

    IsActive: true
};


function Rooms() {

    // ==================================================
    // STATE
    // ==================================================

    const [rooms, setRooms] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [search, setSearch] =
        useState("");

    const [showForm, setShowForm] =
        useState(false);

    const [editingId, setEditingId] =
        useState(null);

    const [saving, setSaving] =
        useState(false);

    const [deletingId, setDeletingId] =
        useState(null);

    const [formData, setFormData] =
        useState(initialFormData);


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        let cancelled = false;


        const loadRooms = async () => {

            try {

                const data =
                    await getAllRooms();


                if (!cancelled) {

                    setRooms(
                        Array.isArray(data)
                            ? data
                            : []
                    );
                }


            } catch (error) {

                console.error(
                    "Load rooms error:",
                    error
                );


                if (!cancelled) {

                    alert(
                        error.response?.data?.message ||
                        "Failed to load rooms."
                    );
                }


            } finally {

                if (!cancelled) {

                    setLoading(false);
                }
            }
        };


        loadRooms();


        return () => {

            cancelled = true;
        };

    }, []);


    // ==================================================
    // REFRESH
    // ==================================================

    const refreshRooms = async () => {

        const data =
            await getAllRooms();

        setRooms(
            Array.isArray(data)
                ? data
                : []
        );
    };


    // ==================================================
    // INPUT
    // ==================================================

    const handleChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;


        setFormData((previous) => ({

            ...previous,

            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };


    // ==================================================
    // RESET
    // ==================================================

    const resetForm = () => {

        setFormData(
            initialFormData
        );

        setEditingId(null);

        setShowForm(false);
    };


    // ==================================================
    // ADD
    // ==================================================

    const handleAdd = () => {

        setFormData(
            initialFormData
        );

        setEditingId(null);

        setShowForm(true);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ==================================================
    // EDIT
    // ==================================================

    const handleEdit = (room) => {

        setEditingId(
            room.RoomId
        );


        setFormData({

            CampusId:
                String(
                    room.CampusId ?? ""
                ),

            RoomNumber:
                room.RoomNumber || "",

            RoomName:
                room.RoomName || "",

            RoomType:
                room.RoomType || "",

            Capacity:
                String(
                    room.Capacity ?? ""
                ),

            BuildingName:
                room.BuildingName || "",

            FloorNumber:
                room.FloorNumber !== null &&
                room.FloorNumber !== undefined
                    ? String(
                        room.FloorNumber
                    )
                    : "",

            IsLab:
                Boolean(
                    room.IsLab
                ),

            IsActive:
                Boolean(
                    room.IsActive
                )
        });


        setShowForm(true);


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


    // ==================================================
    // VALIDATION
    // ==================================================

    const validateForm = () => {

        const campusId =
            Number(
                formData.CampusId
            );


        if (
            !Number.isInteger(
                campusId
            ) ||
            campusId <= 0
        ) {

            alert(
                "Valid Campus ID is required."
            );

            return false;
        }


        if (
            !formData.RoomNumber.trim()
        ) {

            alert(
                "Room Number is required."
            );

            return false;
        }


        if (
            !formData.RoomType.trim()
        ) {

            alert(
                "Room Type is required."
            );

            return false;
        }


        const capacity =
            Number(
                formData.Capacity
            );


        if (
            !Number.isInteger(
                capacity
            ) ||
            capacity <= 0
        ) {

            alert(
                "Capacity must be greater than zero."
            );

            return false;
        }


        if (
            formData.FloorNumber !== "" &&
            !Number.isInteger(
                Number(
                    formData.FloorNumber
                )
            )
        ) {

            alert(
                "Floor Number must be a valid integer."
            );

            return false;
        }


        return true;
    };


    // ==================================================
    // SAVE
    // ==================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        if (!validateForm()) {
            return;
        }


        const roomData = {

            CampusId:
                Number(
                    formData.CampusId
                ),

            RoomNumber:
                formData.RoomNumber.trim(),

            RoomName:
                formData.RoomName.trim(),

            RoomType:
                formData.RoomType.trim(),

            Capacity:
                Number(
                    formData.Capacity
                ),

            BuildingName:
                formData.BuildingName.trim(),

            FloorNumber:
                formData.FloorNumber === ""
                    ? null
                    : Number(
                        formData.FloorNumber
                    ),

            IsLab:
                Boolean(
                    formData.IsLab
                ),

            IsActive:
                Boolean(
                    formData.IsActive
                )
        };


        try {

            setSaving(true);


            if (editingId) {

                await updateRoom(
                    editingId,
                    roomData
                );


                alert(
                    "Room updated successfully."
                );


            } else {

                await createRoom(
                    roomData
                );


                alert(
                    "Room added successfully."
                );
            }


            resetForm();

            await refreshRooms();


        } catch (error) {

            console.error(
                "Save room error:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to save room."
            );


        } finally {

            setSaving(false);
        }
    };


    // ==================================================
    // DELETE
    // ==================================================

    const handleDelete = async (
        roomId
    ) => {

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this room?"
            );


        if (!confirmed) {
            return;
        }


        try {

            setDeletingId(
                roomId
            );


            const result =
                await deleteRoom(
                    roomId
                );


            alert(
                result.message ||
                "Room processed successfully."
            );


            await refreshRooms();


        } catch (error) {

            console.error(
                "Delete room error:",
                error
            );


            alert(
                error.response?.data?.message ||
                "Failed to delete room."
            );


        } finally {

            setDeletingId(null);
        }
    };


    // ==================================================
    // SEARCH
    // ==================================================

    const searchText =
        search
            .trim()
            .toLowerCase();


    const filteredRooms =
        rooms.filter((room) => {

            return (

                String(
                    room.CampusId ?? ""
                ).includes(searchText)

                ||

                room.RoomNumber
                    ?.toLowerCase()
                    .includes(
                        searchText
                    )

                ||

                room.RoomName
                    ?.toLowerCase()
                    .includes(
                        searchText
                    )

                ||

                room.RoomType
                    ?.toLowerCase()
                    .includes(
                        searchText
                    )

                ||

                room.BuildingName
                    ?.toLowerCase()
                    .includes(
                        searchText
                    )
            );
        });


    // ==================================================
    // UI
    // ==================================================

    return (

        <div className="rooms-page">

            <div className="rooms-header">

                <div>

                    <h1>
                        Rooms
                    </h1>

                    <p>
                        Manage classrooms, labs and room capacities.
                    </p>

                </div>


                <button
                    type="button"
                    className="add-room-btn"
                    onClick={
                        handleAdd
                    }
                >
                    + Add Room
                </button>

            </div>


            {/* FORM */}

            {showForm && (

                <div className="room-form-card">

                    <div className="room-form-header">

                        <h2>

                            {editingId
                                ? "Edit Room"
                                : "Add New Room"
                            }

                        </h2>


                        <button
                            type="button"
                            className="room-close-btn"
                            onClick={
                                resetForm
                            }
                            disabled={
                                saving
                            }
                        >
                            ×
                        </button>

                    </div>


                    <form
                        onSubmit={
                            handleSubmit
                        }
                    >

                        <div className="room-form-grid">


                            <div className="room-form-group">

                                <label htmlFor="CampusId">
                                    Campus ID *
                                </label>

                                <input
                                    id="CampusId"
                                    type="number"
                                    name="CampusId"
                                    min="1"
                                    value={
                                        formData.CampusId
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. 1"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            <div className="room-form-group">

                                <label htmlFor="RoomNumber">
                                    Room Number *
                                </label>

                                <input
                                    id="RoomNumber"
                                    type="text"
                                    name="RoomNumber"
                                    maxLength={30}
                                    value={
                                        formData.RoomNumber
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. R101"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            <div className="room-form-group">

                                <label htmlFor="RoomName">
                                    Room Name
                                </label>

                                <input
                                    id="RoomName"
                                    type="text"
                                    name="RoomName"
                                    maxLength={100}
                                    value={
                                        formData.RoomName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Room 101"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            <div className="room-form-group">

                                <label htmlFor="RoomType">
                                    Room Type *
                                </label>

                                <input
                                    id="RoomType"
                                    type="text"
                                    name="RoomType"
                                    maxLength={30}
                                    value={
                                        formData.RoomType
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Classroom"
                                    disabled={
                                        saving
                                    }
                                    list="room-types"
                                />

                                <datalist id="room-types">
                                    <option value="Classroom" />
                                    <option value="Computer Lab" />
                                    <option value="Science Lab" />
                                    <option value="Lecture Hall" />
                                    <option value="Auditorium" />
                                </datalist>

                            </div>


                            <div className="room-form-group">

                                <label htmlFor="Capacity">
                                    Capacity *
                                </label>

                                <input
                                    id="Capacity"
                                    type="number"
                                    name="Capacity"
                                    min="1"
                                    value={
                                        formData.Capacity
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. 50"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            <div className="room-form-group">

                                <label htmlFor="BuildingName">
                                    Building Name
                                </label>

                                <input
                                    id="BuildingName"
                                    type="text"
                                    name="BuildingName"
                                    maxLength={100}
                                    value={
                                        formData.BuildingName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Main Block"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            <div className="room-form-group">

                                <label htmlFor="FloorNumber">
                                    Floor Number
                                </label>

                                <input
                                    id="FloorNumber"
                                    type="number"
                                    name="FloorNumber"
                                    value={
                                        formData.FloorNumber
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. 1"
                                    disabled={
                                        saving
                                    }
                                />

                            </div>


                            <div className="room-checkbox-group">

                                <label>

                                    <input
                                        type="checkbox"
                                        name="IsLab"
                                        checked={
                                            formData.IsLab
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            saving
                                        }
                                    />

                                    <span>
                                        Laboratory
                                    </span>

                                </label>

                            </div>


                            <div className="room-checkbox-group">

                                <label>

                                    <input
                                        type="checkbox"
                                        name="IsActive"
                                        checked={
                                            formData.IsActive
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            saving
                                        }
                                    />

                                    <span>
                                        Active Room
                                    </span>

                                </label>

                            </div>

                        </div>


                        <div className="room-form-actions">

                            <button
                                type="button"
                                className="room-cancel-btn"
                                onClick={
                                    resetForm
                                }
                                disabled={
                                    saving
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="submit"
                                className="room-save-btn"
                                disabled={
                                    saving
                                }
                            >

                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Room"
                                        : "Save Room"
                                }

                            </button>

                        </div>

                    </form>

                </div>
            )}


            {/* SEARCH */}

            <div className="rooms-toolbar">

                <div className="rooms-search-box">

                    <input
                        type="text"
                        value={
                            search
                        }
                        onChange={
                            (e) =>
                                setSearch(
                                    e.target.value
                                )
                        }
                        placeholder="Search room number, name, type, building or campus..."
                    />

                </div>


                <div className="room-count">

                    Total Rooms:

                    <strong>
                        {" "}
                        {
                            filteredRooms.length
                        }
                    </strong>

                </div>

            </div>


            {/* TABLE */}

            <div className="rooms-table-card">

                {loading ? (

                    <div className="rooms-loading">
                        Loading rooms...
                    </div>

                ) : filteredRooms.length === 0 ? (

                    <div className="rooms-empty-state">

                        <h3>
                            No Rooms Found
                        </h3>

                        <p>

                            {search
                                ? "No rooms match your search."
                                : "Add your first room."
                            }

                        </p>

                    </div>

                ) : (

                    <div className="rooms-table-wrapper">

                        <table>

                            <thead>

                                <tr>
                                    <th>ID</th>
                                    <th>Campus</th>
                                    <th>Room No.</th>
                                    <th>Room Name</th>
                                    <th>Type</th>
                                    <th>Capacity</th>
                                    <th>Building</th>
                                    <th>Floor</th>
                                    <th>Lab</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>

                            </thead>


                            <tbody>

                                {filteredRooms.map(
                                    (room) => (

                                        <tr
                                            key={
                                                room.RoomId
                                            }
                                        >

                                            <td>
                                                {
                                                    room.RoomId
                                                }
                                            </td>

                                            <td>
                                                {
                                                    room.CampusId
                                                }
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        room.RoomNumber
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    room.RoomName ||
                                                    "—"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    room.RoomType
                                                }
                                            </td>

                                            <td>
                                                {
                                                    room.Capacity
                                                }
                                            </td>

                                            <td>
                                                {
                                                    room.BuildingName ||
                                                    "—"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    room.FloorNumber ??
                                                    "—"
                                                }
                                            </td>

                                            <td>

                                                {room.IsLab ? (

                                                    <span className="room-badge room-lab">
                                                        Lab
                                                    </span>

                                                ) : (

                                                    <span className="room-badge room-classroom">
                                                        No
                                                    </span>

                                                )}

                                            </td>

                                            <td>

                                                {room.IsActive ? (

                                                    <span className="room-badge room-active">
                                                        Active
                                                    </span>

                                                ) : (

                                                    <span className="room-badge room-inactive">
                                                        Inactive
                                                    </span>

                                                )}

                                            </td>

                                            <td>

                                                <div className="room-actions">

                                                    <button
                                                        type="button"
                                                        className="room-edit-btn"
                                                        onClick={() =>
                                                            handleEdit(
                                                                room
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="room-delete-btn"
                                                        onClick={() =>
                                                            handleDelete(
                                                                room.RoomId
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >

                                                        {deletingId ===
                                                        room.RoomId
                                                            ? "Deleting..."
                                                            : "Delete"
                                                        }

                                                    </button>

                                                </div>

                                            </td>

                                        </tr>
                                    )
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>

        </div>
    );
}


export default Rooms;