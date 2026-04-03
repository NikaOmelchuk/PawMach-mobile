import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api';

export function useOnlineStatus() {
    const wsRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        async function connect() {
            const token = await AsyncStorage.getItem('token');
            if (!token || !isMounted) return;


            const url = API_BASE.replace('http', 'ws').replace('/api/v1', '/ws/online/') + `?token=${token}`;

            if (wsRef.current) return;

            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onclose = () => {
                wsRef.current = null;
                if (isMounted) setTimeout(connect, 5000);
            };

            ws.onerror = () => {
                ws.close();
            };
        }

        connect();

        return () => {
            isMounted = false;
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);
}
