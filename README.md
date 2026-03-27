# PawMatch Mobile 🐾
**Студентка:** Омельчук Ніка Романівна  
**Група:** КВ-51мп  
**Лабораторна робота №2:** «Розробка мобільного додатку для роботи з REST API»

---

## 📋 Завдання до роботи
Розробити мобільний додаток (iOS/Android), що інтегрується з раніше створеним REST API (Django). Додаток має забезпечувати:
1. Авторизацію користувачів та управління профілем.
2. Перегляд доступних опитувань.
3. Можливість приєднуватися до сесій за кодом та проходити опитування в реальному часі.
4. Відображення онлайн-статусу учасників сесії.

---

## 📄 Звіт
[Посилання на документ звіту (Google Drive)](https://docs.google.com/document/d/1NZvT3jBGCAVFBO1DL7YQV7Yy3_gVZg_vpmgPuruMHTo/edit?usp=sharing)

---

## 🚀 Технології
- **Framework:** React Native (Expo)
- **REST API Client:** Axios (аналог Retrofit/Volley для JS)
- **Navigation:** React Navigation
- **State Management:** React Hooks (useState, useEffect)
- **Storage:** AsyncStorage (для зберігання токенів та даних профілю)

---

## 🔗 Інтеграція з Backend
API знаходиться у файлі `mobile/src/api.js`.  
Для підключення використовується базова URL-адреса, що вказує на локальну IP-адресу сервера (через Wi-Fi) або публічний тунель ngrok.
