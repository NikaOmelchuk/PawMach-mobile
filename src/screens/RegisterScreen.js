import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { useTheme } from '../theme';

export default function RegisterScreen({ navigation }) {
    const { colors } = useTheme();
    const s = getStyles(colors);
    const [form, setForm] = useState({
        username: '',
        first_name: '',
        email: '',
        gender: '',
        birth_date: '',
        password: '',
        password2: ''
    });
    const [loading, setLoading] = useState(false);

    function update(key, val) {
        setForm(prev => ({ ...prev, [key]: val }));
    }

    async function handleRegister() {
        if (!form.username || !form.first_name || !form.email || !form.gender || !form.birth_date || !form.password || !form.password2) {
            Alert.alert('Помилка', 'Заповніть всі поля');
            return;
        }
        if (form.password !== form.password2) {
            Alert.alert('Помилка', 'Паролі не співпадають');
            return;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(form.birth_date)) {
            Alert.alert('Помилка', 'Дата народження має бути у форматі РРРР-ММ-ДД');
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                ...form,
                email: form.email.trim().toLowerCase(),
                username: form.username.trim()
            };
            const res = await api.post('/auth/register/', submitData);
            await AsyncStorage.setItem('token', res.data.token);
            await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
            navigation.replace('Surveys');
        } catch (err) {
            console.error('Registration Error:', err.response?.data || err.message);
            const data = err.response?.data;
            const msg = data?.detail || data?.email?.[0] || data?.username?.[0] || data?.password2?.[0] || 'Помилка реєстрації';
            Alert.alert('Помилка', msg);
        } finally {
            setLoading(false);
        }
    }

    const renderGenderOption = (label, value) => {
        const isActive = form.gender === value;
        return (
            <TouchableOpacity
                style={[s.genderBtn, isActive && s.genderBtnActive]}
                onPress={() => update('gender', value)}
            >
                <Text style={[s.genderText, isActive && s.genderTextActive]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.card}>
                    <Text style={s.logo}>🐾 PawMatch</Text>
                    <Text style={s.title}>Реєстрація</Text>

                    <TextInput style={s.input} placeholder="Логін (username)" placeholderTextColor="#a78bfa"
                        value={form.username} onChangeText={v => update('username', v)} autoCapitalize="none" />

                    <TextInput style={s.input} placeholder="Ваше ім'я" placeholderTextColor="#a78bfa"
                        value={form.first_name} onChangeText={v => update('first_name', v)} />

                    <TextInput style={s.input} placeholder="Email" placeholderTextColor="#a78bfa"
                        value={form.email} onChangeText={v => update('email', v)} keyboardType="email-address" autoCapitalize="none" />

                    <Text style={s.label}>Стать:</Text>
                    <View style={s.genderRow}>
                        {renderGenderOption('Чоловік', 'M')}
                        {renderGenderOption('Жінка', 'F')}
                        {renderGenderOption('Інше', 'O')}
                    </View>

                    <TextInput style={s.input} placeholder="Дата народження (РРРР-ММ-ДД)" placeholderTextColor="#a78bfa"
                        value={form.birth_date} onChangeText={v => update('birth_date', v)} />

                    <TextInput style={s.input} placeholder="Пароль" placeholderTextColor="#a78bfa"
                        value={form.password} onChangeText={v => update('password', v)} secureTextEntry />

                    <TextInput style={s.input} placeholder="Підтвердження пароля" placeholderTextColor="#a78bfa"
                        value={form.password2} onChangeText={v => update('password2', v)} secureTextEntry />

                    <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Зареєструватись</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={s.link}>Вже є акаунт? Увійти</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
    card: { width: '100%', maxWidth: 380, backgroundColor: colors.card, borderRadius: 20, padding: 28, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    logo: { fontSize: 32, textAlign: 'center', marginBottom: 8, color: colors.text },
    title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 24 },
    input: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 14, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    label: { color: colors.text, fontSize: 14, marginBottom: 8, fontWeight: '600', marginLeft: 4 },
    genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
    genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    genderBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    genderText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
    genderTextActive: { color: colors.buttonText },
    btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
    btnText: { color: colors.buttonText, fontWeight: '700', fontSize: 16 },
    link: { color: colors.accent, textAlign: 'center', marginTop: 16, fontSize: 13 },
});
