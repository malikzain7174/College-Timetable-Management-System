import axios from "axios";


const API_URL =
    "http://localhost:5000/api/departments";


// ======================================================
// GET ALL
// ======================================================

export const getAllDepartments =
    async () => {

        const response =
            await axios.get(
                API_URL
            );


        return response.data;
    };


// ======================================================
// GET BY ID
// ======================================================

export const getDepartmentById =
    async (
        id
    ) => {

        const response =
            await axios.get(
                `${API_URL}/${id}`
            );


        return response.data;
    };


// ======================================================
// CREATE
// ======================================================

export const createDepartment =
    async (
        department
    ) => {

        const response =
            await axios.post(
                API_URL,
                department
            );


        return response.data;
    };


// ======================================================
// UPDATE
// ======================================================

export const updateDepartment =
    async (
        id,
        department
    ) => {

        const response =
            await axios.put(

                `${API_URL}/${id}`,

                department
            );


        return response.data;
    };


// ======================================================
// DELETE
// ======================================================

export const deleteDepartment =
    async (
        id
    ) => {

        const response =
            await axios.delete(
                `${API_URL}/${id}`
            );


        return response.data;
    };