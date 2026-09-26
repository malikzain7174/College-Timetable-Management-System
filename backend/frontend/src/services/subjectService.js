import axios from "axios";

const API_URL = "http://localhost:5000/api/subjects";


// GET ALL SUBJECTS
export const getAllSubjects = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};


// GET SUBJECT BY ID
export const getSubjectById = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};


// CREATE SUBJECT
export const createSubject = async (subject) => {
    const response = await axios.post(API_URL, subject);
    return response.data;
};


// UPDATE SUBJECT
export const updateSubject = async (id, subject) => {
    const response = await axios.put(
        `${API_URL}/${id}`,
        subject
    );

    return response.data;
};


// DELETE SUBJECT
export const deleteSubject = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};