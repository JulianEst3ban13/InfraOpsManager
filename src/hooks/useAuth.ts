import { useState, useEffect } from 'react';

interface User {
    id: number;
    username: string;
    // Añade otros campos del usuario según necesites
}

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                setUser(userData);
            }
        } catch (error) {
            console.error('Error getting user from localStorage:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return { user, loading };
}; 