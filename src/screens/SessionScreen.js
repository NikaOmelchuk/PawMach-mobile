import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, FlatList } from 'react-native';
import api from '../api';
import { useTheme } from '../theme';

export default function SessionScreen({ route, navigation }) {
    const { colors } = useTheme();
    const s = getStyles(colors);
    const { mode, surveyId, surveyTitle, id } = route.params || {};

    const [phase, setPhase] = useState(mode === 'join' ? 'join' : 'loading');
    const [code, setCode] = useState('');
    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentQ, setCurrentQ] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (mode === 'create' && surveyId) {
            createSession();
        } else if (id) {
            loadSession(id);
        }
    }, [id, surveyId]);

    useEffect(() => {
        let interval;
        if (session?.id) {
            interval = setInterval(() => {
                api.get(`/sessions/${session.id}/`).then(res => setSession(res.data)).catch(() => {});
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [session?.id]);

    async function loadSession(sId) {
        setBusy(true);
        try {
            const res = await api.get(`/sessions/${sId}/`);
            setSession(res.data);
            const actualSurvId = typeof res.data.survey === 'object' ? res.data.survey.id : res.data.survey;
            await loadQuestions(actualSurvId);
            setPhase('survey');
        } catch (err) {
            Alert.alert('Помилка', 'Не вдалося завантажити сесію');
            navigation.goBack();
        } finally {
            setBusy(false);
        }
    }

    async function createSession() {
        setBusy(true);
        try {
            const res = await api.post('/sessions/', { survey_id: surveyId });
            setSession(res.data);
            const actualSurvId = typeof res.data.survey === 'object' && res.data.survey !== null ? res.data.survey.id : res.data.survey;
            await loadQuestions(actualSurvId);
            setPhase('survey');
        } catch (err) {
            Alert.alert('Помилка', err.response?.data?.detail || 'Не вдалося створити сесію');
            navigation.goBack();
        } finally {
            setBusy(false);
        }
    }

    async function joinSession() {
        if (!code.trim()) { Alert.alert('Помилка', 'Введіть код сесії'); return; }
        setBusy(true);
        try {
            const res = await api.post('/sessions/join/', { session_code: code.trim().toUpperCase() });
            setSession(res.data);
            const actualSurvId = typeof res.data.survey === 'object' && res.data.survey !== null ? res.data.survey.id : res.data.survey;
            await loadQuestions(actualSurvId);
            setPhase('survey');
        } catch (err) {
            Alert.alert('Помилка', err.response?.data?.detail || 'Сесію не знайдено');
        } finally {
            setBusy(false);
        }
    }

    async function loadQuestions(survId) {
        const res = await api.get(`/surveys/${survId}/`);
        setQuestions(res.data.questions || []);
    }

    async function submitAnswers() {
        const payload = Object.values(answers);
        if (!payload.length) { Alert.alert('Попередження', 'Дайте хоча б одну відповідь'); return; }
        setBusy(true);
        try {
            const res = await api.post(`/sessions/${session.id}/submit/`, { answers: payload });
            Alert.alert('✅ Готово!', `Збережено ${res.data.saved} відповідей`);
            setSubmitted(true);
        } catch (err) {
            Alert.alert('Помилка', err.response?.data?.detail || 'Помилка надсилання');
        } finally {
            setBusy(false);
        }
    }

    function handleChoice(qId, optId) {
        setAnswers(prev => ({ ...prev, [qId]: { question_id: qId, selected_option_id: optId } }));
    }

    function handleScale(qId, val) {
        setAnswers(prev => ({ ...prev, [qId]: { question_id: qId, scale_value: val } }));
    }

    if (phase === 'loading') {
        return <View style={s.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;
    }

    if (phase === 'join') {
        return (
            <View style={s.root}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
                    <Text style={s.headerTitle}>Приєднатись</Text>
                    <View style={{ width: 60 }} />
                </View>
                <View style={s.joinWrap}>
                    <Text style={s.joinIcon}>🔑</Text>
                    <Text style={s.joinTitle}>Код сесії</Text>
                    <TextInput
                        style={s.codeInput}
                        placeholder="XXXXXX"
                        placeholderTextColor="#4c2aad"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="characters"
                        maxLength={8}
                    />
                    <TouchableOpacity style={s.btn} onPress={joinSession} disabled={busy}>
                        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Приєднатись</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const q = questions[currentQ];
    const total = questions.length;
    const isLast = currentQ === total - 1;
    const progress = total ? (currentQ + 1) / total : 0;

    return (
        <View style={s.root}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
                <Text style={s.headerTitle} numberOfLines={1}>{session?.survey?.title || surveyTitle}</Text>
                <View style={s.codePill}><Text style={s.codeText}>{session?.session_code}</Text></View>
            </View>

            <View style={s.progressWrap}>
                <View style={[s.progressBar, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={s.progressLabel}>{currentQ + 1} / {total}</Text>

            {submitted ? (
                <View style={s.center}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
                    <Text style={s.doneText}>Відповіді надіслано!</Text>
                    <Text style={s.doneSub}>Чекайте поки всі учасники завершать</Text>
                    {session?.status === 'completed' && (
                        <TouchableOpacity style={[s.btn, { marginTop: 20 }]} onPress={() => navigation.goBack()}>
                            <Text style={s.btnText}>На головну</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : q ? (
                <ScrollView contentContainerStyle={s.qWrap}>
                    <Text style={s.qNum}>Питання {currentQ + 1}</Text>
                    <Text style={s.qText}>{q.text}</Text>

                    {q.question_type === 'scale' ? (
                        <View style={s.scaleWrap}>
                            <Text style={s.scaleVal}>{answers[q.id]?.scale_value ?? 5}</Text>
                            {[1,2,3,4,5,6,7,8,9,10].map(v => (
                                <TouchableOpacity
                                    key={v}
                                    style={[s.scaleBtn, answers[q.id]?.scale_value === v && s.scaleBtnActive]}
                                    onPress={() => handleScale(q.id, v)}
                                >
                                    <Text style={[s.scaleBtnText, answers[q.id]?.scale_value === v && { color: '#fff' }]}>{v}</Text>
                                </TouchableOpacity>
                            ))}
                            <View style={s.scaleLabels}>
                                <Text style={s.scaleLabelText}>Зовсім ні</Text>
                                <Text style={s.scaleLabelText}>Повністю так</Text>
                            </View>
                        </View>
                    ) : (
                        (q.options || []).map(opt => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[s.optBtn, answers[q.id]?.selected_option_id === opt.id && s.optBtnActive]}
                                onPress={() => handleChoice(q.id, opt.id)}
                            >
                                <Text style={[s.optText, answers[q.id]?.selected_option_id === opt.id && { color: '#fff' }]}>{opt.text}</Text>
                            </TouchableOpacity>
                        ))
                    )}

                    <View style={s.navRow}>
                        <TouchableOpacity style={s.navBtn} onPress={() => setCurrentQ(c => Math.max(0, c - 1))} disabled={currentQ === 0}>
                            <Text style={[s.navBtnText, currentQ === 0 && { opacity: 0.3 }]}>← Назад</Text>
                        </TouchableOpacity>

                        {!isLast ? (
                            <TouchableOpacity style={[s.navBtn, s.navBtnPrimary]} onPress={() => setCurrentQ(c => Math.min(total - 1, c + 1))}>
                                <Text style={[s.navBtnText, { color: '#fff' }]}>Далі →</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[s.navBtn, s.navBtnPrimary]} onPress={submitAnswers} disabled={busy}>
                                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[s.navBtnText, { color: '#fff' }]}>✅ Надіслати</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={s.participantsWrap}>
                        <Text style={s.participantsTitle}>👥 Учасники</Text>
                        {session?.participants?.map(p => (
                            <View key={p.id} style={s.participantRow}>
                                <View style={s.avatarWrap}>
                                    <Text style={s.avatarText}>{p.username[0].toUpperCase()}</Text>
                                    {p.is_online && <View style={s.onlineMark} />}
                                </View>
                                <Text style={[s.participantName, !p.is_online && { opacity: 0.6 }]}>{p.username}</Text>
                                {session?.submitted_users?.includes(p.username) && <Text style={{ fontSize: 12 }}>✅</Text>}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            ) : null}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    back: { color: colors.accent, fontSize: 14, width: 60 },
    headerTitle: { color: colors.text, fontWeight: '700', fontSize: 16, flex: 1, textAlign: 'center' },
    codePill: { backgroundColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    codeText: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    progressWrap: { height: 4, backgroundColor: colors.border, marginHorizontal: 16, marginTop: 12, borderRadius: 4, overflow: 'hidden' },
    progressBar: { height: 4, backgroundColor: colors.primary, borderRadius: 4 },
    progressLabel: { color: colors.textSecondary, fontSize: 12, textAlign: 'right', marginHorizontal: 16, marginTop: 4 },
    qWrap: { padding: 16 },
    qNum: { color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
    qText: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 20, lineHeight: 26 },
    optBtn: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
    optBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optText: { color: colors.text, fontSize: 15 },
    scaleWrap: { alignItems: 'center', marginBottom: 20 },
    scaleVal: { fontSize: 48, color: colors.primary, fontWeight: '700', marginBottom: 12 },
    scaleBtn: { width: '100%', padding: 12, backgroundColor: colors.background, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    scaleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    scaleBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
    scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 },
    scaleLabelText: { color: colors.textSecondary, fontSize: 11 },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    navBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: colors.border },
    navBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    navBtnText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
    joinWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    joinIcon: { fontSize: 64, marginBottom: 12 },
    joinTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 20 },
    codeInput: { width: '100%', backgroundColor: colors.background, borderRadius: 14, padding: 18, color: colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 6, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    btn: { width: '100%', backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center' },
    btnText: { color: colors.buttonText, fontWeight: '700', fontSize: 16 },
    doneSub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
    doneText: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
    participantsWrap: { marginTop: 32, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
    participantsTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 12 },
    participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
    avatarWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    avatarText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
    onlineMark: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: colors.card },
    participantName: { color: colors.text, fontSize: 14, fontWeight: '500', flex: 1 },
});
