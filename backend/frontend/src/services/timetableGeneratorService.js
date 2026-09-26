import axios from "axios";


const API_URL =
    "http://localhost:5000/api/timetable-generator";


export const generateTimetable =
    async (
        academicSessionId,
        clearExisting = true
    ) => {

        const response =
            await axios.post(
                `${API_URL}/generate`,
                {
                    AcademicSessionId:
                        academicSessionId,

                    ClearExisting:
                        clearExisting
                }
            );

        return response.data;
    };


export const getGeneratedTimetable =
    async (
        academicSessionId
    ) => {

        const response =
            await axios.get(
                `${API_URL}/${academicSessionId}`
            );

        return response.data;
    };


export const deleteGeneratedTimetable =
    async (
        academicSessionId
    ) => {

        const response =
            await axios.delete(
                `${API_URL}/${academicSessionId}`
            );

        return response.data;
    };