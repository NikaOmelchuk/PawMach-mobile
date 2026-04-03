import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// export const API_BASE = 'http://192.168.3.111:8000/api/v1';
// export const API_BASE = 'http://174.16.1.147:8000/api/v1';
export const API_BASE = 'http://174.16.1.188:8000/api/v1';
// export const API_BASE = 'https://ninety-turtles-knock.loca.lt/api/v1';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000

});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
});

export default api;
