import axios from "axios";


const API_URL =
    "http://localhost:5000/api/conflicts";


// ======================================================
// GET CONFLICTS
// ======================================================

export const getAllConflicts =
    async (academicSessionId = null) => {

        const response =
            await axios.get(
                API_URL,
                {
                    params:
                        academicSessionId
                            ? {
                                academicSessionId
                            }
                            : {}
                }
            );

        return (
            response.data?.conflicts ||
            []
        );
    };


// ======================================================
// SUMMARY
// ======================================================

export const getConflictSummary =
    async (academicSessionId = null) => {

        const response =
            await axios.get(
                `${API_URL}/summary`,
                {
                    params:
                        academicSessionId
                            ? {
                                academicSessionId
                            }
                            : {}
                }
            );

        return (
            response.data?.data ||
            {}
        );
    };


// ======================================================
// VALIDATE
// ======================================================

export const validateTimetable =
    async (academicSessionId) => {

        const response =
            await axios.get(
                `${API_URL}/validate/${academicSessionId}`
            );

        return response.data?.data;
    };