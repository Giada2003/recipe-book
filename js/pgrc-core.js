/**
 * PGRC - Piattaforma per la Gestione di Ricette di Cucina
 * Core System - Gestione Web Storage, API e Autenticazione
 */

class PGRCSystem {
    constructor() {
        this.dbKey = 'pgrc_db';
        this.apiUrl = 'https://www.themealdb.com/api/json/v1/1';
    }

    // ==========================================
    // 1. GESTIONE WEB STORAGE (DATABASE LOCALE)
    // ==========================================

    _getDB() {
        const db = localStorage.getItem(this.dbKey);
        if (db) return JSON.parse(db);

        // Struttura iniziale del DB se non esiste
        return {
            recipes: {},        // Oggetto con ID ricetta come chiave per evitare duplicati
            users: {},          // Oggetto con username come chiave
            currentUser: null,  // Username dell'utente attualmente loggato
            interactions: {}    // Interazioni: interactions[username][mealId] = { saved, note, reviews }
        };
    }

    _saveDB(db) {
        localStorage.setItem(this.dbKey, JSON.stringify(db));
    }

    // ==========================================
    // 2. STARTUP E API THEMEALDB
    // ==========================================

    /**
     * Inizializza l'app. Da chiamare al DOMContentLoaded.
     */
    async startup() {
        let db = this._getDB();

        // Se il DB ha meno di 6 ricette, scarica 6 ricette casuali
        if (Object.keys(db.recipes).length < 6) {
            console.log("Popolamento dati: Scaricamento di 6 ricette casuali...");
            try {
                // Array di 6 chiamate simultanee all'API random
                const promises = [];
                for(let i = 0; i < 6; i++) {
                    promises.push(fetch(`${this.apiUrl}/random.php`).then(res => res.json()));
                }

                const results = await Promise.all(promises);

                results.forEach(data => {
                    if (data.meals && data.meals[0]) {
                        const meal = data.meals[0];
                        db.recipes[meal.idMeal] = meal;
                    }
                });

                this._saveDB(db);
                console.log("Startup completato: Ricette salvate nel Web Storage.");
            } catch (error) {
                console.error("Errore di connessione API allo startup:", error);
            }
        }
    }

    // ==========================================
    // 3. AUTENTICAZIONE UTENTE
    // ==========================================

    register(username, email, password, preferences = []) {
        const db = this._getDB();

        if (db.users[username]) {
            throw new Error("Username già esistente.");
        }

        db.users[username] = {
            email: email,
            password: password, // In un'app reale andrebbe hashata
            preferences: preferences
        };

        // Inizializza lo spazio interazioni per questo utente
        db.interactions[username] = {};

        this._saveDB(db);
        return true;
    }

    login(username, password) {
        const db = this._getDB();
        const user = db.users[username];

        if (!user || user.password !== password) {
            throw new Error("Credenziali non valide.");
        }

        db.currentUser = username;
        this._saveDB(db);
        return true;
    }

    logout() {
        const db = this._getDB();
        db.currentUser = null;
        this._saveDB(db);
    }

    getCurrentUser() {
        const db = this._getDB();
        if (!db.currentUser) return null;
        return { username: db.currentUser, ...db.users[db.currentUser] };
    }

    deleteAccount() {
        const db = this._getDB();
        const user = db.currentUser;
        if (user) {
            delete db.users[user];
            delete db.interactions[user];
            db.currentUser = null;
            this._saveDB(db);
            return true;
        }
        return false;
    }

    // ==========================================
    // 4. RICERCA RICETTE (PROGETTO FULL)
    // ==========================================

    async searchRecipes(query, type = 'name') {
        let endpoint = '';
        if (type === 'name') endpoint = `/search.php?s=${query}`; // Ricerca per nome
        if (type === 'ingredient') endpoint = `/filter.php?i=${query}`; // Ricerca per ingrediente

        try {
            const res = await fetch(`${this.apiUrl}${endpoint}`);
            const data = await res.json();

            if (!data.meals) return [];

            // Salviamo le nuove ricette trovate nel DB locale per averle disponibili offline
            const db = this._getDB();
            data.meals.forEach(meal => {
                // L'API filter.php non restituisce tutti i dettagli, solo id, nome e img.
                // Idealmente qui potresti fare un lookup per ID se mancano i dettagli.
                if (!db.recipes[meal.idMeal]) {
                    db.recipes[meal.idMeal] = meal;
                }
            });
            this._saveDB(db);

            return data.meals;
        } catch (error) {
            console.error("Errore ricerca:", error);
            return [];
        }
    }

    // ==========================================
    // 5. GESTIONE RICETTARIO, NOTE E RECENSIONI
    // ==========================================

    _initUserInteraction(db, mealId) {
        const user = db.currentUser;
        if (!user) throw new Error("Utente non loggato.");

        if (!db.interactions[user][mealId]) {
            db.interactions[user][mealId] = { saved: false, note: "", reviews: [] };
        }
        return user;
    }

    toggleRecipeInBook(mealId) {
        const db = this._getDB();
        const user = this._initUserInteraction(db, mealId);

        const isCurrentlySaved = db.interactions[user][mealId].saved;
        db.interactions[user][mealId].saved = !isCurrentlySaved;

        this._saveDB(db);
        return db.interactions[user][mealId].saved; // Ritorna true se salvata, false se rimossa
    }

    savePrivateNote(mealId, noteText) {
        const db = this._getDB();
        const user = this._initUserInteraction(db, mealId);

        db.interactions[user][mealId].note = noteText;
        this._saveDB(db);
    }

    addReview(mealId, difficulty, taste) {
        const db = this._getDB();
        const user = this._initUserInteraction(db, mealId);

        // Validazione voti (da 1 a 5 come da specifica)
        if (difficulty < 1 || difficulty > 5 || taste < 1 || taste > 5) {
            throw new Error("I voti devono essere compresi tra 1 e 5.");
        }

        const newReview = {
            date: new Date().toISOString().split('T')[0], // Es: "2026-10-04"
            difficulty: parseInt(difficulty),
            taste: parseInt(taste)
        };

        db.interactions[user][mealId].reviews.push(newReview);
        this._saveDB(db);
        return newReview;
    }

    getUserInteractions(mealId) {
        const db = this._getDB();
        const user = db.currentUser;
        if (!user || !db.interactions[user] || !db.interactions[user][mealId]) {
            return { saved: false, note: "", reviews: [] };
        }
        return db.interactions[user][mealId];
    }

    getPersonalRecipeBook() {
        const db = this._getDB();
        const user = db.currentUser;
        if (!user) return [];

        const savedMeals = [];
        for (const [mealId, interaction] of Object.entries(db.interactions[user])) {
            if (interaction.saved && db.recipes[mealId]) {
                savedMeals.push(db.recipes[mealId]);
            }
        }
        return savedMeals;
    }
}

// Inizializza un'istanza globale da usare nell'interfaccia utente
const PGRC = new PGRCSystem();
