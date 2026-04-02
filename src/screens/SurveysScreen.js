import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { useTheme } from '../theme';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function SurveysScreen({ navigation }) {
    const { colors, theme, toggleTheme } = useTheme();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mySessions, setMySessions] = useState([]);
    const [user, setUser] = useState(null);

    useOnlineStatus();

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const u = await AsyncStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
            const [survRes, sessRes] = await Promise.all([
                api.get('/surveys/'),
                api.get('/sessions/')
            ]);
            setSurveys(survRes.data.results || survRes.data);
            setMySessions(sessRes.data.results || sessRes.data);
        } catch {
            Alert.alert('Помилка', 'Не вдалося завантажити опитування');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    async function handleLogout() {
        try { await api.post('/auth/logout/'); } catch { }
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        navigation.replace('Login');
    }

    if (loading) {
        return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <View style={[s.root, { backgroundColor: colors.background }]}>
            <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Text style={[s.headerTitle, { color: colors.text }]}>🐾 PawMatch</Text>
                <View style={s.headerRight}>
                    <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 10 }}>
                        <Text style={{ fontSize: 20 }}>{theme === 'dark' ? '🌞' : '🌙'}</Text>
                    </TouchableOpacity>
                    {user && <Text style={[s.username, { color: colors.accent }]}>{user.username}</Text>}
                    <TouchableOpacity onPress={handleLogout} style={[s.logoutBtn, { backgroundColor: colors.border }]}>
                        <Text style={[s.logoutText, { color: colors.accent }]}>Вийти</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={[s.joinCard, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={() => navigation.navigate('Session', { mode: 'join' })}>
                <Text style={s.joinIcon}>🔑</Text>
                <View>
                    <Text style={[s.joinTitle, { color: colors.text }]}>Приєднатись до сесії</Text>
                    <Text style={[s.joinSub, { color: colors.accent }]}>Введіть код сесії від учасника</Text>
                </View>
            </TouchableOpacity>

            {mySessions.filter(s => s.status !== 'completed').length > 0 && (
                <View style={{ marginBottom: 20 }}>
                    <Text style={[s.sectionTitle, { color: colors.accent }]}>Мої активні сесії 🚀</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                        {mySessions.filter(s => s.status !== 'completed').map(sess => (
                            <TouchableOpacity
                                key={sess.id}
                                style={[s.miniCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                                onPress={() => navigation.navigate('Session', { id: sess.id, surveyTitle: sess.survey?.title })}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <View style={s.onlineDot} />
                                    <Text style={[s.codeTextMini, { color: colors.primary }]}>{sess.session_code}</Text>
                                </View>
                                <Text style={[s.miniTitle, { color: colors.text }]} numberOfLines={1}>{sess.survey?.title}</Text>
                                <Text style={[s.miniAction, { color: colors.accent }]}>Продовжити →</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <Text style={[s.sectionTitle, { color: colors.accent }]}>Доступні опитування</Text>

            <FlatList
                data={surveys}
                keyExtractor={item => String(item.id)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('Session', { surveyId: item.id, surveyTitle: item.title, mode: 'create' })}
                    >
                        <View style={s.cardHeader}>
                            <Text style={s.cardIcon}>{item.category?.icon || '📋'}</Text>
                            <Text style={[s.cardCategory, { color: colors.primary }]}>{item.category?.name}</Text>
                        </View>
                        <Text style={[s.cardTitle, { color: colors.text }]}>{item.title}</Text>
                        {item.description ? <Text style={[s.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}
                        <View style={s.cardFooter}>
                            <Text style={[s.cardMeta, { color: colors.textSecondary }]}>👥 до {item.max_participants} учасників</Text>
                            <Text style={[s.cardAction, { color: colors.accent }]}>Почати →</Text>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={[s.empty, { color: colors.textSecondary }]}>Немає доступних опитувань</Text>}
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0f0a1e' },
    center: { flex: 1, backgroundColor: '#0f0a1e', alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48, backgroundColor: '#1a1035', borderBottomWidth: 1, borderBottomColor: '#2d1f5e' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#e2d9fc' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    username: { color: '#a78bfa', fontSize: 13 },
    logoutBtn: { backgroundColor: '#2d1f5e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    logoutText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
    joinCard: { flexDirection: 'row', alignItems: 'center', gap: 14, margin: 16, padding: 16, backgroundColor: '#1a1035', borderRadius: 16, borderWidth: 1, borderColor: '#7c3aed' },
    joinIcon: { fontSize: 28 },
    joinTitle: { color: '#e2d9fc', fontWeight: '700', fontSize: 15 },
    joinSub: { color: '#a78bfa', fontSize: 12, marginTop: 2 },
    sectionTitle: { color: '#a78bfa', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' },
    card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1a1035', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2d1f5e' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    cardIcon: { fontSize: 18 },
    cardCategory: { color: '#7c3aed', fontSize: 12, fontWeight: '600' },
    cardTitle: { color: '#e2d9fc', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    cardDesc: { color: '#8b8bad', fontSize: 13, marginBottom: 8 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardMeta: { color: '#8b8bad', fontSize: 12 },
    cardAction: { color: '#a78bfa', fontSize: 13, fontWeight: '700' },
    empty: { color: '#8b8bad', textAlign: 'center', marginTop: 40, fontSize: 15 },
    miniCard: { width: 160, padding: 12, borderRadius: 16, borderWidth: 1, backgroundColor: '#1a1035' },
    miniTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    miniAction: { fontSize: 11, fontWeight: '700' },
    codeTextMini: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
});
