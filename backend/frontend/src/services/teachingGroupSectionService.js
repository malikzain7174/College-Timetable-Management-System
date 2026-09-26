import axios from "axios";

const API_URL =
    "http://localhost:5000/api/teaching-group-sections";


export const getAllTeachingGroupSections =
    async () => {

        const response =
            await axios.get(API_URL);

        return response.data;
    };


export const getTeachingGroupSections =
    async (teachingGroupId) => {

        const response =
            await axios.get(
                `${API_URL}/group/${teachingGroupId}`
            );

        return response.data;
    };


export const syncTeachingGroupSections =
    async (
        teachingGroupId,
        sectionIds
    ) => {

        const response =
            await axios.put(
                `${API_URL}/group/${teachingGroupId}/sync`,
                {
                    SectionIds:
                        sectionIds
                }
            );

        return response.data;
    };