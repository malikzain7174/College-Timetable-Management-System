import axios from "axios";


const API_URL =
    "http://localhost:5000/api/timetableentries";


export const getAllTimetableEntries =
    async () => {

        const response =
            await axios.get(
                API_URL
            );

        return response.data;
    };


export const getTimetableEntriesBySession =
    async (
        academicSessionId
    ) => {

        const response =
            await axios.get(
                `${API_URL}/session/${academicSessionId}`
            );

        return response.data;
    };


export const createTimetableEntry =
    async (data) => {

        const response =
            await axios.post(
                API_URL,
                data
            );

        return response.data;
    };


export const updateTimetableEntry =
    async (
        id,
        data
    ) => {

        const response =
            await axios.put(
                `${API_URL}/${id}`,
                data
            );

        return response.data;
    };


export const deleteTimetableEntry =
    async (id) => {

        const response =
            await axios.delete(
                `${API_URL}/${id}`
            );

        return response.data;
    };