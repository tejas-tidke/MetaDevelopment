import axios from "axios";
import { auth } from "../firebase";
import { getCurrentUser } from "./authService";

const USER_UID_HEADER = "X-User-Uid";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const firebaseUid = (auth?.currentUser?.uid || "").toString().trim();
    const storedUid = (getCurrentUser()?.uid || "").toString().trim();
    const resolvedUid = firebaseUid || storedUid;

    config.headers = config.headers || {};
    if (resolvedUid) {
      config.headers[USER_UID_HEADER] = resolvedUid;
    } else if (config.headers[USER_UID_HEADER]) {
      delete config.headers[USER_UID_HEADER];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
