import axios from "axios";


const API_URL =
    "http://localhost:5000/api/sections";


// GET ALL
export const getAllSections =
    async () => {

        const response =
            await axios.get(
                API_URL
            );

        return response.data;
    };


// LOOKUPS
export const getSectionLookups =
    async () => {

        const response =
            await axios.get(
                `${API_URL}/lookups`
            );

        return response.data;
    };


// CREATE CAMPUS
export const createCampus =
    async data => {

        const response =
            await axios.post(
                `${API_URL}/lookups/campuses`,
                data
            );

        return response.data;
    };


// CREATE SESSION
export const createAcademicSession =
    async data => {

        const response =
            await axios.post(
                `${API_URL}/lookups/sessions`,
                data
            );

        return response.data;
    };


// GET BY ID
export const getSectionById =
    async id => {

        const response =
            await axios.get(
                `${API_URL}/${id}`
            );

        return response.data;
    };


// CREATE SECTION
export const createSection =
    async section => {

        const response =
            await axios.post(
                API_URL,
                section
            );

        return response.data;
    };


// UPDATE SECTION
export const updateSection =
    async (
        id,
        section
    ) => {

        const response =
            await axios.put(
                `${API_URL}/${id}`,
                section
            );

        return response.data;
    };


// DELETE
export const deleteSection =
    async id => {

        const response =
            await axios.delete(
                `${API_URL}/${id}`
            );

        return response.data;
    };