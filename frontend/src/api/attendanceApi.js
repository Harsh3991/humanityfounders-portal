import API from "./axiosInstance";

export const getAttendanceToday = async () => {
    const response = await API.get("/attendance/today");
    return response.data;
};

export const clockIn = async () => {
    const response = await API.post("/attendance/clock-in");
    return response.data;
};

export const goAway = async () => {
    const response = await API.post("/attendance/away");
    return response.data;
};

export const resumeWork = async () => {
    const response = await API.post("/attendance/resume");
    return response.data;
};

export const clockOut = async (dailyReport) => {
    const response = await API.post("/attendance/clock-out", { dailyReport });
    return response.data;
};

export const getAttendanceHistory = async (month, year) => {
    const response = await API.get(`/attendance/history?month=${month}&year=${year}`);
    return response.data;
};
