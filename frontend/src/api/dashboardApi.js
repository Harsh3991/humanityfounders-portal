import API from "./axiosInstance";

export const getDashboardData = async () => {
    const response = await API.get("/dashboard");
    return response.data;
};
