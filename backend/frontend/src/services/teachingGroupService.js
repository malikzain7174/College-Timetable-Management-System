import axios from "axios";

const API_URL =
    "http://localhost:5000/api/teaching-groups";


export const getAllTeachingGroups =
    async () => {

        const response =
            await axios.get(API_URL);

        return response.data;
    };


export const getTeachingGroupById =
    async (id) => {

        const response =
            await axios.get(
                `${API_URL}/${id}`
            );

        return response.data;
    };


export const createTeachingGroup =
    async (data) => {

        const response =
            await axios.post(
                API_URL,
                data
            );

        return response.data;
    };


export const updateTeachingGroup =
    async (id, data) => {

        const response =
            await axios.put(
                `${API_URL}/${id}`,
                data
            );

        return response.data;
    };


export const deleteTeachingGroup =
    async (id) => {

        const response =
            await axios.delete(
                `${API_URL}/${id}`
            );

        return response.data;
    };