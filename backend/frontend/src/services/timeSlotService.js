import axios from "axios";

const API_URL =
    "http://localhost:5000/api/timeslots";


export const getAllTimeSlots = async () => {

    const response =
        await axios.get(API_URL);

    return response.data;
};


export const getTimeSlotById = async (id) => {

    const response =
        await axios.get(
            `${API_URL}/${id}`
        );

    return response.data;
};


export const createTimeSlot = async (
    timeSlot
) => {

    const response =
        await axios.post(
            API_URL,
            timeSlot
        );

    return response.data;
};


export const updateTimeSlot = async (
    id,
    timeSlot
) => {

    const response =
        await axios.put(
            `${API_URL}/${id}`,
            timeSlot
        );

    return response.data;
};


export const deleteTimeSlot = async (id) => {

    const response =
        await axios.delete(
            `${API_URL}/${id}`
        );

    return response.data;
};