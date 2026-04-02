import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, ScrollView, Clipboard, ToastAndroid, Platform
} from 'react-native';
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
    const [results, setResults] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Load current user info
    useEffect(() => {
        api.get('/auth/profile/').then(res => setCurrentUser(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (mode === 'create' && surveyId) {
            createSession();
        } else if (id) {
            loadSession(id);
        }
    }, [id, surveyId]);

    // Poll session status
    useEffect(() => {
        let interval;
        if (session?.id) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/sessions/${session.id}/`);
                    setSession(res.data);
                    // If session just became completed and we don't have results yet
                    if (res.data.status === 'completed' && results.length === 0) {
                        fetchResults(session.id);
                    }
                } catch {}
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [session?.id, results.length]);

    async function fetchResults(sessionId) {
        try {
            const res = await api.get(`/sessions/${sessionId}/results/`);
            setResults(res.data);
            setPhase('results');
        } catch {}
    }

    async function loadSession(sId) {
        setBusy(true);
        try {
            const res = await api.get(`/sessions/${sId}/`);
            setSession(res.data);
            const actualSurvId = typeof res.data.survey === 'object' ? res.data.survey.id : res.data.survey;
            await loadQuestions(actualSurvId);
            if (res.data.status === 'completed') {
                await fetchResults(sId);
            } else {
                setPhase('survey');
            }
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

    async function completeSession() {
        Alert.alert(
            'Завершити сесію?',
            'Всі учасники отримають результати сумісності. Цю дію не можна скасувати.',
            [
                { text: 'Скасувати', style: 'cancel' },
                {
                    text: 'Завершити', style: 'destructive',
                    onPress: async () => {
                        setBusy(true);
                        try {
                            const res = await api.post(`/sessions/${session.id}/complete/`);
                            setResults(res.data);
                            const updatedSession = await api.get(`/sessions/${session.id}/`);
                            setSession(updatedSession.data);
                            setPhase('results');
                        } catch (err) {
                            Alert.alert('Помилка', err.response?.data?.detail || 'Не вдалося завершити сесію');
                        } finally {
                            setBusy(false);
                        }
                    }
                }
            ]
        );
    }

    function handleChoice(qId, optId) {
        setAnswers(prev => ({ ...prev, [qId]: { question_id: qId, selected_option_id: optId } }));
    }

    function handleScale(qId, val) {
        setAnswers(prev => ({ ...prev, [qId]: { question_id: qId, scale_value: val } }));
    }

    function copyCode() {
        if (!session?.session_code) return;
        Clipboard.setString(session.session_code);
        if (Platform.OS === 'android') {
            ToastAndroid.show('Код скопійовано! 📋', ToastAndroid.SHORT);
        } else {
            Alert.alert('Скопійовано!', `Код "${session.session_code}" скопійовано в буфер обміну`);
        }
    }

    const isOrganizer = currentUser && session?.created_by && (
        currentUser.id === session.created_by.id ||
        currentUser.username === session.created_by.username
    );

    const allSubmitted = session?.participants?.length > 0 &&
        session?.submitted_users?.length >= session?.participants?.length;

    function getScoreColor(score) {
        if (score >= 75) return '#10B981';
        if (score >= 50) return '#F59E0B';
        if (score >= 25) return '#EF4444';
        return '#6B7280';
    }

    function getScoreEmoji(score) {
        if (score >= 75) return '💚';
        if (score >= 50) return '💛';
        if (score >= 25) return '🧡';
        return '💔';
    }

    // ── LOADING ──────────────────────────────────────────────────────────────
    if (phase === 'loading') {
        return <View style={s.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;
    }

    // ── JOIN ─────────────────────────────────────────────────────────────────
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

    // ── RESULTS ──────────────────────────────────────────────────────────────
    if (phase === 'results') {
        return (
            <View style={s.root}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
                    <Text style={s.headerTitle}>Результати</Text>
                    <View style={{ width: 60 }} />
                </View>
                <ScrollView contentContainerStyle={s.resultsWrap}>
                    <View style={s.resultsBanner}>
                        <Text style={{ fontSize: 48, marginBottom: 8 }}>💜</Text>
                        <Text style={s.resultsBannerTitle}>{session?.survey?.title || surveyTitle}</Text>
                        <Text style={s.resultsBannerSub}>Ось наскільки ви схожі між собою</Text>
                    </View>

                    {results.length === 0 ? (
                        <View style={s.noResults}>
                            <Text style={s.noResultsText}>Результати обчислюються...</Text>
                            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
                        </View>
                    ) : (
                        results.map((r, i) => {
                            const score = Math.round(r.score);
                            const scoreColor = getScoreColor(score);
                            return (
                                <View key={r.id || i} style={s.resultCard}>
                                    <View style={s.resultCardHeader}>
                                        <View style={s.resultAvatars}>
                                            <View style={[s.resultAvatar, { backgroundColor: colors.primary + '33' }]}>
                                                <Text style={[s.resultAvatarText, { color: colors.primary }]}>
                                                    {r.user1?.username?.[0]?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                            <Text style={s.resultAvatarSep}>×</Text>
                                            <View style={[s.resultAvatar, { backgroundColor: scoreColor + '33' }]}>
                                                <Text style={[s.resultAvatarText, { color: scoreColor }]}>
                                                    {r.user2?.username?.[0]?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[s.scoreBadge, { backgroundColor: scoreColor + '22', borderColor: scoreColor }]}>
                                            <Text style={[s.scoreNum, { color: scoreColor }]}>{score}%</Text>
                                            <Text style={s.scoreEmoji}>{getScoreEmoji(score)}</Text>
                                        </View>
                                    </View>

                                    <Text style={s.resultNames}>
                                        {r.user1?.username} & {r.user2?.username}
                                    </Text>

                                    {/* Score bar */}
                                    <View style={s.scoreBarWrap}>
                                        <View style={[s.scoreBar, { width: `${score}%`, backgroundColor: scoreColor }]} />
                                    </View>

                                    {/* Tags */}
                                    {r.lifestyle_tags?.length > 0 && (
                                        <View style={s.tagsRow}>
                                            {r.lifestyle_tags.map((tag, ti) => (
                                                <View key={ti} style={s.tag}>
                                                    <Text style={s.tagText}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Strengths */}
                                    {r.strengths?.length > 0 && (
                                        <View style={s.factorSection}>
                                            <Text style={s.factorTitle}>💚 Спільне</Text>
                                            {r.strengths.slice(0, 3).map((s_, si) => (
                                                <Text key={si} style={s.factorItem}>• {s_}</Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* Weaknesses */}
                                    {r.weaknesses?.length > 0 && (
                                        <View style={s.factorSection}>
                                            <Text style={s.factorTitle}>🔶 Відмінності</Text>
                                            {r.weaknesses.slice(0, 3).map((w, wi) => (
                                                <Text key={wi} style={s.factorItem}>• {w}</Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}

                    <TouchableOpacity style={[s.btn, { marginTop: 16, marginBottom: 32 }]} onPress={() => navigation.goBack()}>
                        <Text style={s.btnText}>🐾 На головну</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // ── SURVEY ───────────────────────────────────────────────────────────────
    const q = questions[currentQ];
    const total = questions.length;
    const isLast = currentQ === total - 1;
    const progress = total ? (currentQ + 1) / total : 0;

    return (
        <View style={s.root}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← Назад</Text></TouchableOpacity>
                <Text style={s.headerTitle} numberOfLines={1}>{session?.survey?.title || surveyTitle}</Text>
                <TouchableOpacity style={s.codePill} onPress={copyCode} activeOpacity={0.7}>
                    <Text style={s.codeText}>{session?.session_code}</Text>
                    <Text style={s.codeCopyHint}>📋</Text>
                </TouchableOpacity>
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

                    {/* Organizer: complete button */}
                    {isOrganizer && !session?.status !== 'completed' && (
                        <TouchableOpacity
                            style={[s.btn, s.btnComplete, { marginTop: 24 }]}
                            onPress={completeSession}
                            disabled={busy}
                        >
                            {busy
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={s.btnText}>🏁 Завершити сесію</Text>
                            }
                        </TouchableOpacity>
                    )}

                    {session?.status === 'completed' && (
                        <TouchableOpacity
                            style={[s.btn, { marginTop: 20 }]}
                            onPress={() => fetchResults(session.id)}
                        >
                            <Text style={s.btnText}>💜 Переглянути результати</Text>
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

                    {/* Participants list */}
                    <View style={s.participantsWrap}>
                        <View style={s.participantsHeader}>
                            <Text style={s.participantsTitle}>👥 Учасники</Text>
                            {isOrganizer && (
                                <TouchableOpacity
                                    style={[s.completeBtn, !allSubmitted && { opacity: 0.5 }]}
                                    onPress={completeSession}
                                    disabled={busy}
                                >
                                    <Text style={s.completeBtnText}>🏁 Завершити</Text>
                                </TouchableOpacity>
                            )}
                        </View>
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
    codePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
    codeText: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    codeCopyHint: { fontSize: 11 },
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
    btnComplete: { backgroundColor: '#EF4444' },
    btnText: { color: colors.buttonText, fontWeight: '700', fontSize: 16 },
    doneSub: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
    doneText: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
    participantsWrap: { marginTop: 32, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
    participantsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    participantsTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    completeBtn: { backgroundColor: '#EF444422', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#EF4444' },
    completeBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
    participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
    avatarWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    avatarText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
    onlineMark: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: colors.card },
    participantName: { color: colors.text, fontSize: 14, fontWeight: '500', flex: 1 },
    // Results styles
    resultsWrap: { padding: 16 },
    resultsBanner: { alignItems: 'center', paddingVertical: 24 },
    resultsBannerTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
    resultsBannerSub: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
    noResults: { alignItems: 'center', padding: 32 },
    noResultsText: { color: colors.textSecondary, fontSize: 16 },
    resultCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    resultAvatars: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resultAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    resultAvatarText: { fontSize: 16, fontWeight: '700' },
    resultAvatarSep: { color: colors.textSecondary, fontSize: 18, fontWeight: '700' },
    scoreBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 4 },
    scoreNum: { fontSize: 20, fontWeight: '800' },
    scoreEmoji: { fontSize: 16 },
    resultNames: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    scoreBarWrap: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    scoreBar: { height: 8, borderRadius: 4 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    tag: { backgroundColor: colors.primary + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    tagText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
    factorSection: { marginTop: 8 },
    factorTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
    factorItem: { color: colors.textSecondary, fontSize: 12, marginLeft: 8, marginBottom: 2, lineHeight: 18 },
});
