import axios from "axios";

const API_URL =
    "http://localhost:5000/api/teachers";


export const getAllTeachers = async () => {

    const response =
        await axios.get(API_URL);

    return response.data;
};


export const getTeacherById = async (id) => {

    const response =
        await axios.get(
            `${API_URL}/${id}`
        );

    return response.data;
};


export const createTeacher = async (
    teacher
) => {

    const response =
        await axios.post(
            API_URL,
            teacher
        );

    return response.data;
};


export const updateTeacher = async (
    id,
    teacher
) => {

    const response =
        await axios.put(
            `${API_URL}/${id}`,
            teacher
        );

    return response.data;
};


export const deleteTeacher = async (id) => {

    const response =
        await axios.delete(
            `${API_URL}/${id}`
        );

    return response.data;
};