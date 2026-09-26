import axios from "axios";

const API_URL =
    "http://localhost:5000/api/rooms";


export const getAllRooms = async () => {

    const response =
        await axios.get(API_URL);

    return response.data;
};


export const getRoomById = async (id) => {

    const response =
        await axios.get(
            `${API_URL}/${id}`
        );

    return response.data;
};


export const createRoom = async (room) => {

    const response =
        await axios.post(
            API_URL,
            room
        );

    return response.data;
};


export const updateRoom = async (
    id,
    room
) => {

    const response =
        await axios.put(
            `${API_URL}/${id}`,
            room
        );

    return response.data;
};


export const deleteRoom = async (id) => {

    const response =
        await axios.delete(
            `${API_URL}/${id}`
        );

    return response.data;
};