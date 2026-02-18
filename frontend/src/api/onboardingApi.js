import API from "./axiosInstance";

export const getOnboardingStatus = async () => {
    const response = await API.get("/onboarding/status");
    return response.data;
};

export const submitStep1 = async (formData) => {
    // formData is a FormData object (multipart/form-data) for file uploads
    const response = await API.post("/onboarding/step1", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const submitStep2 = async (data) => {
    const response = await API.post("/onboarding/step2", data);
    return response.data;
};
