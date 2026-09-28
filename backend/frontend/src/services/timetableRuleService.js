import axios from "axios";


const API_URL =
    "http://localhost:5000/api/timetable-rules";


export const getAllTimetableRules =
    async () => {

        const response =
            await axios.get(
                API_URL
            );


        return response.data;
    };


export const createTimetableRule =
    async data => {

        const response =
            await axios.post(
                API_URL,
                data
            );


        return response.data;
    };


export const updateTimetableRule =
    async (
        ruleId,
        data
    ) => {

        const response =
            await axios.put(
                `${API_URL}/${ruleId}`,
                data
            );


        return response.data;
    };


export const toggleTimetableRule =
    async (
        ruleId,
        isEnabled
    ) => {

        const response =
            await axios.patch(
                `${API_URL}/${ruleId}/toggle`,
                {
                    IsEnabled:
                        isEnabled
                }
            );


        return response.data;
    };


export const deleteTimetableRule =
    async ruleId => {

        const response =
            await axios.delete(
                `${API_URL}/${ruleId}`
            );


        return response.data;
    };