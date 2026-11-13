/**
 * Piattaforma per la Gestione di Ricette di Cucina
 * Core System - Gestione Web Storage, API e Autenticazione
 */

class PGRCSystem {
    constructor() {
        this.dbKey = 'pgrc_db';
        this.apiUrl = 'https://www.themealdb.com/api/json/v1/1';
        this.passwordIterations = 600000;
    }

    // ==========================================
    // 1. GESTIONE WEB STORAGE (DATABASE LOCALE)
    // ==========================================

    _getDB() {
        let serialized;
        try {
            serialized = localStorage.getItem(this.dbKey);
        } catch (cause) {
            throw this._createError('STORAGE', "Impossibile leggere i dati salvati nel browser.", cause);
        }

        if (serialized === null) {
            return this._defaultDB();
        }

        let db;
        try {
            db = JSON.parse(serialized);
        } catch (cause) {
            throw this._createError('STORAGE', "I dati salvati nel browser sono danneggiati e non possono essere letti.", cause);
        }

        if (!this._isRecord(db) || !this._isRecord(db.recipes) || !this._isRecord(db.users) ||
            !this._isRecord(db.interactions) || !(db.currentUser === null || typeof db.currentUser === 'string')) {
            throw this._createError('STORAGE', "Il database locale è incompleto o ha una struttura non valida.");
        }

        db.reviews = db.reviews === undefined ? {} : db.reviews;
        db.loadedRecipeLetters = db.loadedRecipeLetters === undefined ? [] : db.loadedRecipeLetters;
        if (!this._isRecord(db.reviews) || !Array.isArray(db.loadedRecipeLetters) ||
            db.loadedRecipeLetters.some(letter => typeof letter !== 'string')) {
            throw this._createError('STORAGE', "Il database locale contiene dati incompleti o non validi.");
        }

        for (const [mealId, meal] of Object.entries(db.recipes)) {
            if (!this._isRecord(meal) || String(meal.idMeal) !== mealId || typeof meal.strMeal !== 'string') {
                throw this._createError('STORAGE', `I dati locali della ricetta ${mealId} sono incompleti.`);
            }
        }
        for (const [username, user] of Object.entries(db.users)) {
            if (!this._isRecord(user) || typeof user.email !== 'string' ||
                !(typeof user.password === 'string' || this._isRecord(user.password)) ||
                !this._isRecord(db.interactions[username])) {
                throw this._createError('STORAGE', `I dati locali dell'utente ${username} sono incompleti.`);
            }
        }
        for (const [username, interactions] of Object.entries(db.interactions)) {
            if (!this._isRecord(interactions)) {
                throw this._createError('STORAGE', "Le interazioni salvate nel browser hanno una struttura non valida.");
            }
            for (const interaction of Object.values(interactions)) {
                if (!this._isRecord(interaction) || typeof interaction.saved !== 'boolean' ||
                    (interaction.note !== undefined && typeof interaction.note !== 'string') ||
                    (interaction.reviews !== undefined && !Array.isArray(interaction.reviews))) {
                    throw this._createError('STORAGE', `Le interazioni locali dell'utente ${username} sono incomplete.`);
                }
            }
        }
        for (const reviews of Object.values(db.reviews)) {
            if (!Array.isArray(reviews)) {
                throw this._createError('STORAGE', "Le recensioni salvate nel browser hanno una struttura non valida.");
            }
        }
        if (db.currentUser && !db.users[db.currentUser]) {
            throw this._createError('STORAGE', "La sessione locale fa riferimento a un utente inesistente.");
        }

        return db;
    }

    _isRecord(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    _createError(code, message, cause) {
        const error = new Error(message);
        error.code = code;
        if (cause) error.cause = cause;
        return error;
    }

    async _fetchJson(url) {
        let response;
        try {
            response = await fetch(url);
        } catch (cause) {
            throw this._createError('CONNECTION', "Errore di connessione. Verifica la connessione internet e riprova.", cause);
        }

        if (!response || !response.ok) {
            throw this._createError('API_RESPONSE', `Errore nella risposta API (HTTP ${response ? response.status : 'sconosciuto'}).`);
        }

        let data;
        try {
            data = await response.json();
        } catch (cause) {
            throw this._createError('API_RESPONSE', "Errore nella risposta API: il contenuto non è JSON valido.", cause);
        }
        if (!this._isRecord(data)) {
            throw this._createError('API_RESPONSE', "Errore nella risposta API: formato non valido.");
        }
        return data;
    }

    _readMeals(data) {
        if (!Object.prototype.hasOwnProperty.call(data, 'meals') ||
            !(data.meals === null || Array.isArray(data.meals))) {
            throw this._createError('API_RESPONSE', "Errore nella risposta API: elenco ricette mancante o non valido.");
        }

        const meals = data.meals || [];
        if (meals.some(meal => !this._isRecord(meal) || meal.idMeal == null || typeof meal.strMeal !== 'string')) {
            throw this._createError('API_RESPONSE', "Errore nella risposta API: i dati di una ricetta sono incompleti.");
        }
        return meals;
    }

    _saveDB(db) {
        try {
            localStorage.setItem(this.dbKey, JSON.stringify(db));
        } catch (cause) {
            throw this._createError('STORAGE', "Impossibile salvare i dati nel Web Storage del browser.", cause);
        }
    }

    _defaultDB() {
        return {
            recipes: {},        // Oggetto con ID ricetta come chiave per evitare duplicati
            users: {},          // Oggetto con username come chiave
            currentUser: null,  // Username dell'utente attualmente loggato
            interactions: {},   // Interazioni: interactions[username][mealId] = { saved, note, reviews }
            reviews: {},        // Recensioni pubbliche: reviews[mealId] = [...]
            loadedRecipeLetters: []
        };
    }

    _bytesToHex(bytes) {
        return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
    }

    _hexToBytes(hex) {
        if (typeof hex !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(hex)) {
            throw new Error("Formato password archiviata non valido.");
        }
        return Uint8Array.from(hex.match(/.{2}/gi), byte => parseInt(byte, 16));
    }

    async _derivePasswordHash(password, salt, iterations) {
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        return crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
            key,
            256
        );
    }

    async _hashPassword(password) {
        if (typeof password !== 'string') throw new Error("La password non è valida.");

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const hash = await this._derivePasswordHash(password, salt, this.passwordIterations);
        return {
            algorithm: 'PBKDF2-SHA256',
            iterations: this.passwordIterations,
            salt: this._bytesToHex(salt),
            hash: this._bytesToHex(hash)
        };
    }

    async _verifyPassword(password, storedPassword) {
        if (typeof storedPassword === 'string') return storedPassword === password;
        if (!storedPassword || storedPassword.algorithm !== 'PBKDF2-SHA256' ||
            !Number.isInteger(storedPassword.iterations) ||
            storedPassword.iterations < 100000 || storedPassword.iterations > 1000000) {
            throw new Error("Formato password archiviata non valido.");
        }

        const salt = this._hexToBytes(storedPassword.salt);
        const expectedHash = this._hexToBytes(storedPassword.hash);
        const actualHash = new Uint8Array(
            await this._derivePasswordHash(password, salt, storedPassword.iterations)
        );
        if (actualHash.length !== expectedHash.length) return false;

        let difference = 0;
        for (let index = 0; index < actualHash.length; index++) {
            difference |= actualHash[index] ^ expectedHash[index];
        }
        return difference === 0;
    }

    async _migratePlaintextPasswords(db) {
        let changed = false;
        for (const user of Object.values(db.users || {})) {
            if (user && typeof user.password === 'string') {
                user.password = await this._hashPassword(user.password);
                changed = true;
            }
        }
        if (changed) this._saveDB(db);
    }

    // ==========================================
    // 2. STARTUP E API THEMEALDB
    // ==========================================

    /**
     * Inizializza l'app. Da chiamare al DOMContentLoaded.
     */
    async startup() {
        const db = this._getDB();
        db.recipes = db.recipes || {};
        await this._migratePlaintextPasswords(db);

        const alphabet = Array.from({ length: 26 }, (_, index) => String.fromCharCode(97 + index));
        const loadedLetters = new Set(Array.isArray(db.loadedRecipeLetters) ? db.loadedRecipeLetters : []);
        const lettersToFetch = alphabet.filter(letter => !loadedLetters.has(letter));
        if (lettersToFetch.length === 0) return;

        console.log(`Popolamento dati: ricerca ricette per ${lettersToFetch.length} iniziali...`);
        const results = await Promise.allSettled(lettersToFetch.map(async letter => {
            const data = await this._fetchJson(`${this.apiUrl}/search.php?f=${letter}`);
            return { letter, meals: this._readMeals(data) };
        }));

        let successfulResponses = 0;
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Errore caricamento ricette per la lettera ${lettersToFetch[index]}:`, result.reason);
                return;
            }

            const { letter, meals } = result.value;
            meals.forEach(meal => {
                db.recipes[meal.idMeal] = meal;
            });
            loadedLetters.add(letter);
            successfulResponses++;
        });

        if (successfulResponses === 0) {
            throw results.find(result => result.status === 'rejected').reason;
        }

        db.loadedRecipeLetters = alphabet.filter(letter => loadedLetters.has(letter));
        this._saveDB(db);
        console.log(`Startup completato: ${Object.keys(db.recipes).length} ricette disponibili nel Web Storage.`);
    }

    // ==========================================
    // 3. AUTENTICAZIONE UTENTE
    // ==========================================

    async register(username, email, password, preferences = []) {
        const db = this._getDB();

        if (db.users[username]) {
            throw new Error("Username già esistente.");
        }
        if (typeof password !== 'string' || password.length === 0) {
            throw new Error("La password è obbligatoria.");
        }

        const hashedPassword = await this._hashPassword(password);
        const updatedDb = this._getDB();
        if (updatedDb.users[username]) {
            throw new Error("Username già esistente.");
        }

        updatedDb.users[username] = {
            email: email,
            password: hashedPassword,
            preferences: preferences
        };

        // Inizializza lo spazio interazioni per questo utente
        updatedDb.interactions[username] = {};

        this._saveDB(updatedDb);
        return true;
    }

    async login(username, password) {
        const db = this._getDB();
        const user = db.users[username];

        if (!user || !(await this._verifyPassword(password, user.password))) {
            throw new Error("Credenziali non valide.");
        }

        if (typeof user.password === 'string') {
            user.password = await this._hashPassword(password);
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
        const { password, ...userData } = db.users[db.currentUser];
        return { username: db.currentUser, ...userData };
    }

    async updateUserData(username, email, password, preferences = []) {
        const db = this._getDB();
        const currentUsername = db.currentUser;

        if (!currentUsername || !db.users[currentUsername]) {
            throw new Error("Utente non loggato.");
        }

        const newUsername = username.trim();
        if (!newUsername || !email.trim()) {
            throw new Error("Username ed email sono obbligatori.");
        }
        if (newUsername !== currentUsername && db.users[newUsername]) {
            throw new Error("Username già esistente.");
        }
        const hashedPassword = password ? await this._hashPassword(password) : null;

        this._migrateLegacyReviews(db);

        const user = db.users[currentUsername];
        user.email = email.trim();
        user.preferences = preferences
            .map(preference => preference.trim())
            .filter(Boolean);
        if (hashedPassword) user.password = hashedPassword;

        if (newUsername !== currentUsername) {
            db.users[newUsername] = user;
            delete db.users[currentUsername];
            db.interactions[newUsername] = db.interactions[currentUsername] || {};
            delete db.interactions[currentUsername];
            db.currentUser = newUsername;
            Object.values(db.reviews).forEach(reviews => {
                reviews.forEach(review => {
                    if (review.username === currentUsername) review.username = newUsername;
                });
            });
        }

        this._saveDB(db);
        return true;
    }

    deleteAccount() {
        const db = this._getDB();
        const user = db.currentUser;
        if (user) {
            this._migrateLegacyReviews(db);
            Object.entries(db.reviews).forEach(([mealId, reviews]) => {
                const remainingReviews = reviews.filter(review => review.username !== user);
                if (remainingReviews.length > 0) {
                    db.reviews[mealId] = remainingReviews;
                } else {
                    delete db.reviews[mealId];
                }
            });
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
        if (typeof query !== 'string') {
            throw this._createError('INVALID_INPUT', "Inserisci un testo da cercare.");
        }
        const searchTerm = query.trim();
        if (!searchTerm) return [];

        if (type === 'description') {
            const db = this._getDB();
            const normalizedQuery = searchTerm.toLocaleLowerCase();
            const searchableFields = ['strMeal', 'strCategory', 'strArea', 'strInstructions', 'strTags'];

            return Object.values(db.recipes).filter(meal => {
                const textFields = searchableFields.map(field => meal[field]);
                for (let index = 1; index <= 20; index++) {
                    textFields.push(meal[`strIngredient${index}`], meal[`strMeasure${index}`]);
                }
                return textFields.some(value =>
                    typeof value === 'string' && value.toLocaleLowerCase().includes(normalizedQuery)
                );
            });
        }

        let endpoint;
        if (type === 'name') endpoint = `/search.php?s=${encodeURIComponent(searchTerm)}`;
        else if (type === 'ingredient') endpoint = `/filter.php?i=${encodeURIComponent(searchTerm)}`;
        else if (type === 'letter') {
            if (!/^[a-z]$/i.test(searchTerm)) {
                throw new Error("Inserisci una sola lettera da A a Z.");
            }
            endpoint = `/search.php?f=${encodeURIComponent(searchTerm.toLowerCase())}`;
        } else {
            throw new Error("Tipo di ricerca non supportato.");
        }

        const data = await this._fetchJson(`${this.apiUrl}${endpoint}`);
        const meals = this._readMeals(data);
        if (meals.length === 0) return [];

        const db = this._getDB();
        meals.forEach(meal => {
            if (!db.recipes[meal.idMeal] || !this._isCompleteRecipe(db.recipes[meal.idMeal])) {
                db.recipes[meal.idMeal] = meal;
            }
        });
        this._saveDB(db);
        return meals;
    }

    _isCompleteRecipe(meal) {
        return this._isRecord(meal) &&
            meal.idMeal != null &&
            typeof meal.strMeal === 'string' &&
            typeof meal.strInstructions === 'string' &&
            meal.strInstructions.trim() !== '';
    }

    getCachedRecipes() {
        return Object.values(this._getDB().recipes);
    }

    async getRecipeById(mealId) {
        const db = this._getDB();
        const cachedMeal = db.recipes[mealId];
        if (this._isCompleteRecipe(cachedMeal)) return cachedMeal;

        let data;
        try {
            data = await this._fetchJson(`${this.apiUrl}/lookup.php?i=${encodeURIComponent(mealId)}`);
        } catch (error) {
            if (cachedMeal && error.code === 'CONNECTION') {
                throw this._createError(
                    'INCOMPLETE_STORAGE',
                    "La copia locale della ricetta è incompleta e non è possibile scaricare i dettagli senza connessione.",
                    error
                );
            }
            throw error;
        }

        const meals = this._readMeals(data);
        if (meals.length === 0) {
            throw this._createError('RECIPE_NOT_FOUND', "Questa ricetta non è più disponibile sull'API.");
        }

        const meal = meals.find(item => String(item.idMeal) === String(mealId));
        if (!meal) {
            throw this._createError('API_RESPONSE', "Errore nella risposta API: la ricetta richiesta non corrisponde.");
        }
        if (!this._isCompleteRecipe(meal)) {
            throw this._createError('API_RESPONSE', "Errore nella risposta API: i dettagli della ricetta sono incompleti.");
        }

        db.recipes[meal.idMeal] = meal;
        this._saveDB(db);
        return meal;
    }

    async getRandomRecipes(count) {
        if (!Number.isInteger(count) || count < 1) {
            throw this._createError('INVALID_INPUT', "Il numero di ricette richiesto non è valido.");
        }

        const responses = await Promise.all(Array.from({ length: count }, () =>
            this._fetchJson(`${this.apiUrl}/random.php`)
        ));
        const meals = responses.flatMap(response => this._readMeals(response).slice(0, 1));
        if (meals.length === 0) {
            throw this._createError('API_RESPONSE', "Errore nella risposta API: non sono state restituite ricette.");
        }

        const db = this._getDB();
        meals.forEach(meal => {
            db.recipes[meal.idMeal] = meal;
        });
        this._saveDB(db);
        return meals;
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

    deletePrivateNote(mealId) {
        const db = this._getDB();
        const user = this._initUserInteraction(db, mealId);

        delete db.interactions[user][mealId].note;
        this._saveDB(db);
    }

    _migrateLegacyReviews(db) {
        if (db.legacyReviewsMigrated) return;

        db.reviews = db.reviews || {};

        Object.entries(db.interactions || {}).forEach(([username, meals]) => {
            Object.entries(meals || {}).forEach(([mealId, interaction]) => {
                if (!interaction || !Array.isArray(interaction.reviews)) return;

                db.reviews[mealId] = db.reviews[mealId] || [];
                interaction.reviews.forEach((review, index) => {
                    const id = `legacy-${username}-${mealId}-${index}`;
                    if (!db.reviews[mealId].some(existing => existing.id === id)) {
                        db.reviews[mealId].push({ ...review, id, username });
                    }
                });
            });
        });

        db.legacyReviewsMigrated = true;
        this._saveDB(db);
    }

    addReview(mealId, date, difficulty, taste) {
        const db = this._getDB();
        const user = db.currentUser;
        if (!user || !db.users[user]) throw new Error("Utente non loggato.");

        this._migrateLegacyReviews(db);

        const parsedDate = new Date(`${date}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== date) {
            throw new Error("Inserisci una data valida.");
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (date > today) {
            throw new Error("La data di preparazione non può essere futura.");
        }

        const numericDifficulty = Number(difficulty);
        const numericTaste = Number(taste);
        if (!Number.isInteger(numericDifficulty) || numericDifficulty < 1 || numericDifficulty > 5 ||
            !Number.isInteger(numericTaste) || numericTaste < 1 || numericTaste > 5) {
            throw new Error("I voti devono essere compresi tra 1 e 5.");
        }

        const newReview = {
            id: `review-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            username: user,
            date,
            difficulty: numericDifficulty,
            taste: numericTaste
        };

        db.reviews[mealId] = db.reviews[mealId] || [];
        db.reviews[mealId].push(newReview);
        this._saveDB(db);
        return newReview;
    }

    getReviews(mealId) {
        const db = this._getDB();
        this._migrateLegacyReviews(db);
        return db.reviews[mealId] || [];
    }

    removeReview(mealId, reviewId) {
        const db = this._getDB();
        const user = db.currentUser;
        if (!user || !db.users[user]) throw new Error("Utente non loggato.");

        this._migrateLegacyReviews(db);
        const reviews = db.reviews[mealId] || [];
        const reviewIndex = reviews.findIndex(review => review.id === reviewId && review.username === user);
        if (reviewIndex === -1) return false;

        reviews.splice(reviewIndex, 1);
        this._saveDB(db);
        return true;
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
            if (interaction.saved && !db.recipes[mealId]) {
                throw this._createError('STORAGE', `La ricetta ${mealId} salvata nel ricettario non è presente nel Web Storage.`);
            }
            if (interaction.saved) {
                savedMeals.push(db.recipes[mealId]);
            }
        }
        return savedMeals;
    }
}

// Inizializza un'istanza globale da usare nell'interfaccia utente
const PGRC = new PGRCSystem();
