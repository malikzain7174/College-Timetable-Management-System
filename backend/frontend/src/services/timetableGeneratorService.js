import { api, apiUrl } from "../config/api";

const endpoint = apiUrl("/api/timetable-generator");

export async function generateTimetable(sessionId, clearExisting, { previewOnly, previewFingerprint } = {}) {
    const response = await api.post(`${endpoint}/generate`, {
        AcademicSessionId: sessionId, ClearExisting: clearExisting,
        PreviewOnly: Boolean(previewOnly), PreviewFingerprint: previewFingerprint
    });
    return response.data;
}

export async function deleteGeneratedTimetable(sessionId) {
    const response = await api.delete(`${endpoint}/${sessionId}`);
    return response.data;
}
