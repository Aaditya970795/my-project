import axios from "axios";

const api =  axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
})

/**
 * @description service to gnerate interview report based on user self description ,resume and job description
 */
export const genrateInterviewReport = async({jobDescription, resumeFile, selfDescription}) => {
    
    const formData = new FormData();
    formData.append("jobDescription", jobDescription);
    formData.append("resume", resumeFile);
    formData.append("selfDescription", selfDescription);

    const response =  await api.post("/api/interview", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });

    return response.data;
}

/**
 * 
 * @description service to get interview report by interviewId
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data;
}

/**
 * @description service to get all interview
 */
export const getAllInterviewReports = async() => {
    const response = await api.get("/api/interview");

    return response.data;
}

export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
        responseType: "blob"
    })

    return response.data
}