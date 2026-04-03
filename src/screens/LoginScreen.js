import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { useTheme } from '../theme';

export default function LoginScreen({ navigation }) {
    const { colors } = useTheme();
    const s = getStyles(colors);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!email || !password) {
            Alert.alert('Помилка', 'Заповніть всі поля');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/login/', { email: email.trim().toLowerCase(), password });
            await AsyncStorage.setItem('token', res.data.token);
            await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
            navigation.replace('Surveys');
        } catch (err) {
            console.error('Login error:', err, err.response?.data);
            let errMsg = 'Не вдалося увійти. Перевірте з\'єднання.';
            if (err.response && err.response.data) {
                const data = err.response.data;
                errMsg = data.detail || data.non_field_errors?.[0] || Object.values(data)[0]?.[0] || `Помилка сервера: ${err.response.status}`;
            } else if (err.message) {
                errMsg = err.message;
            }
            Alert.alert('Помилка', errMsg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.card}>
                <Text style={s.logo}>🐾 PawMatch</Text>
                <Text style={s.title}>Вхід</Text>

                <TextInput
                    style={s.input}
                    placeholder="Email"
                    placeholderTextColor="#a78bfa"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TextInput
                    style={s.input}
                    placeholder="Пароль"
                    placeholderTextColor="#a78bfa"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Увійти</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={s.link}>Немає акаунту? Зареєструватись</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 380, backgroundColor: colors.card, borderRadius: 20, padding: 28, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    logo: { fontSize: 32, textAlign: 'center', marginBottom: 8, color: colors.text },
    title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 24 },
    input: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 14, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
    btnText: { color: colors.buttonText, fontWeight: '700', fontSize: 16 },
    link: { color: colors.accent, textAlign: 'center', marginTop: 16, fontSize: 13 },
});
