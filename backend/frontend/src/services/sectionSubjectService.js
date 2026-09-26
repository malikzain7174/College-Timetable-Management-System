import axios from "axios";

const API_URL =
    "http://localhost:5000/api/sectionsubjects";


export const getAllSectionSubjects = async () => {

    const response =
        await axios.get(API_URL);

    return response.data;
};


export const getSectionSubjectById = async (
    id
) => {

    const response =
        await axios.get(
            `${API_URL}/${id}`
        );

    return response.data;
};


export const createSectionSubject = async (
    data
) => {

    const response =
        await axios.post(
            API_URL,
            data
        );

    return response.data;
};


export const updateSectionSubject = async (
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


export const deleteSectionSubject = async (
    id
) => {

    const response =
        await axios.delete(
            `${API_URL}/${id}`
        );

    return response.data;
};