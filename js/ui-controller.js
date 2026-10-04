/**
 * PGRC - Piattaforma per la Gestione di Ricette di Cucina
 * UI Controller Definitivo Completo
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inizializza i dati dal Web Storage / API
    await PGRC.startup();

    // 2. Aggiorna sempre la Navbar
    updateNavbarUI();

    // 3. SMISTATORE PAGINE (Router)
    if (document.getElementById('recipe-container')) {
        // Siamo in index.html (Homepage pubblica)
        handleSearchAndRendering();
    }
    else if (document.getElementById('my-recipes-container')) {
        // Siamo in my_recipes.html (Ricettario protetto)
        loadMyRecipesPage();
    }
    else if (document.getElementById('recipe-details-container')) {
        // Siamo in recipe.html (Dettaglio singola ricetta)
        initRecipePage();
    }

    // 4. Imposta gli eventi dei form e bottoni
    setupEventListeners();
});

// ==========================================
// 1. NAVBAR E HOMEPAGE (PUBBLICA)
// ==========================================

function updateNavbarUI() {
    const user = PGRC.getCurrentUser();
    const navUl = document.getElementById('main-navbar');

    if (!navUl) return;

    if (user) {
        navUl.innerHTML = `
            <li><a href="index.html">Home</a></li>
            <li><a href="my_recipes.html">Il Mio Ricettario (${user.username})</a></li>
            <li><a href="#" id="js-logout">Logout</a></li>
        `;
        document.getElementById('js-logout').addEventListener('click', (e) => {
            e.preventDefault();
            PGRC.logout();
            window.location.href = 'index.html';
        });
    } else {
        navUl.innerHTML = `
            <li><a href="index.html">Home</a></li>
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Register</a></li>
        `;
    }
}

async function handleSearchAndRendering() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const loadMoreContainer = document.getElementById('load-more-container');

    if (searchQuery && searchQuery.trim() !== '') {
        if (loadMoreContainer) loadMoreContainer.style.display = 'none'; // Nascondi se in ricerca
        const results = await PGRC.searchRecipes(searchQuery, 'name');
        renderRecipeGrid(results, 'recipe-container');
    } else {
        if (loadMoreContainer) loadMoreContainer.style.display = 'block'; // Mostra nella Home
        const db = JSON.parse(localStorage.getItem('pgrc_db'));
        if (db && db.recipes && Object.keys(db.recipes).length > 0) {
            let recipesArray = Object.values(db.recipes);
            recipesArray = recipesArray.sort(() => 0.5 - Math.random()).slice(0, 6);
            renderRecipeGrid(recipesArray, 'recipe-container');
        }
    }
}

// ==========================================
// 2. PAGINA RICETTARIO (PROTETTA)
// ==========================================

function loadMyRecipesPage() {
    const user = PGRC.getCurrentUser();
    const container = document.getElementById('my-recipes-container');

    if (!user) {
        if (container) {
            container.innerHTML = '<div class="col-12 text-center" style="padding: 40px;"><h4 class="text-danger">Devi effettuare il login per vedere il tuo ricettario.</h4></div>';
        }
        return;
    }

    const savedRecipes = PGRC.getPersonalRecipeBook();
    if (savedRecipes.length === 0) {
        container.innerHTML = '<div class="col-12 text-center" style="padding: 40px;"><p>Il tuo ricettario è vuoto! Torna in Home e salva qualche ricetta.</p></div>';
        return;
    }
    renderRecipeGrid(savedRecipes, 'my-recipes-container');
}

// ==========================================
// 3. GENERATORE GRAFICO DI CARD
// ==========================================

function renderRecipeGrid(recipes, targetContainerId) {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    container.innerHTML = '';

    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><p>Nessuna ricetta trovata.</p></div>';
        return;
    }

    recipes.forEach(meal => {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 col-sm-12';
        col.innerHTML = `
            <div class="recipe-item text-center" style="margin-bottom: 30px;">
                <a href="recipe.html?id=${meal.idMeal}">
                    <img src="${meal.strMealThumb}" alt="${meal.strMeal}" style="object-fit: cover; width: 100%; height: 250px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
                </a>
                <br />
                <h3 style="margin-top: 15px;">${meal.strMeal}</h3>
                <p class="text-muted">${meal.strCategory || ''}</p>
            </div>
        `;
        container.appendChild(col);
    });
}

function appendRecipesToGrid(recipes, targetContainerId) {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    recipes.forEach(meal => {
        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 col-sm-12';
        col.innerHTML = `
            <div class="recipe-item text-center" style="margin-bottom: 30px;">
                <a href="recipe.html?id=${meal.idMeal}">
                    <img src="${meal.strMealThumb}" alt="${meal.strMeal}" style="object-fit: cover; width: 100%; height: 250px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
                </a>
                <br />
                <h3 style="margin-top: 15px; color: #333;">${meal.strMeal}</h3>
                <p class="text-muted">${meal.strCategory || ''}</p>
            </div>
        `;
        container.appendChild(col);
    });
}

// ==========================================
// 4. PAGINA SINGOLA RICETTA (recipe.html)
// ==========================================

async function initRecipePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const mealId = urlParams.get('id');
    const container = document.getElementById('recipe-details-container');

    if (!mealId) {
        container.innerHTML = '<h2 class="text-center">Ricetta non trovata!</h2>';
        return;
    }

    let meal = null;
    const db = JSON.parse(localStorage.getItem('pgrc_db'));

    if (db && db.recipes && db.recipes[mealId]) {
        meal = db.recipes[mealId];
    } else {
        try {
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
            const data = await res.json();
            if (data.meals) meal = data.meals[0];

            if (meal && db) {
                db.recipes[meal.idMeal] = meal;
                localStorage.setItem('pgrc_db', JSON.stringify(db));
            }
        } catch (e) {
            console.error("Errore API:", e);
        }
    }

    if (!meal) {
        container.innerHTML = '<h2 class="text-center">Errore nel caricamento della ricetta.</h2>';
        return;
    }

    renderSingleRecipeHTML(meal);

    if (PGRC.getCurrentUser()) {
        document.getElementById('interactions-area').style.display = 'block';
        setupRecipeInteractions(mealId);
    }
}

function renderSingleRecipeHTML(meal) {
    // 1. Genera Ingredienti
    let ingredientsHTML = '<div class="content-box ingredients-box">';
    for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim() !== "") {
            ingredientsHTML += `<div class="ingredient-item">${ing}: <span class="text-muted">${measure}</span></div>`;
        }
    }
    ingredientsHTML += '</div>';

    // 2. SANITIZZAZIONE DELLE ISTRUZIONI
    // Divide per a capo (sia \n che \r\n per sicurezza)
    let rawSteps = meal.strInstructions.split(/\r?\n/);

    let finalSteps = rawSteps.map(step => {
        let cleanStep = step.trim();
        // Regex: Cerca e rimuove "Step 1", "1.", "Step 2:", "2)", ecc. all'inizio della stringa
        cleanStep = cleanStep.replace(/^(?:step\s*\d+|\d+)\s*[:.\-)]?\s*/i, '');
        return cleanStep.trim();
    }).filter(step => step !== ''); // Rimuove le righe rimaste vuote

    // 3. Genera HTML Istruzioni
    let instructionsHTML = '<div class="content-box">';
    finalSteps.forEach((step, index) => {
        instructionsHTML += `
            <div class="prep-step">
                <div class="step-label">step ${index + 1}</div>
                <p>${step}</p>
            </div>
        `;
    });
    instructionsHTML += '</div>';

    // 4. Iniezione nel DOM
    document.getElementById('recipe-details-container').innerHTML = `
        <div class="col-md-4">
            <img src="${meal.strMealThumb}" class="img-responsive recipe-main-img" alt="${meal.strMeal}">
            <button id="toggleBookBtn" class="btn btn-default btn-block recipe-book-btn" style="display: none;">
                <i class="fa fa-heart-o"></i> Caricamento...
            </button>
        </div>
        <div class="col-md-8">
            <h2 class="recipe-main-title">${meal.strMeal}</h2>

            <div class="recipe-badges-container">
                <span class="recipe-badge badge-category">
                    <i class="fa fa-cutlery"></i> ${meal.strCategory || 'Sconosciuta'}
                </span>
                <span class="recipe-badge badge-area">
                    <i class="fa fa-globe"></i> ${meal.strArea || 'Internazionale'}
                </span>
            </div>

            <h3 class="recipe-section-title">Ingredienti</h3>
            ${ingredientsHTML}

            <h3 class="recipe-section-title">Preparazione</h3>
            ${instructionsHTML}
        </div>
    `;
}

function setupRecipeInteractions(mealId) {
    const userInteractions = PGRC.getUserInteractions(mealId);

    // Bottone Ricettario
    const bookBtn = document.getElementById('toggleBookBtn');
    bookBtn.style.display = 'block';

    const updateBookBtnUI = (isSaved) => {
        if (isSaved) {
            bookBtn.innerHTML = '<i class="fa fa-heart"></i> Rimuovi dal Ricettario';
            bookBtn.className = 'btn btn-danger btn-block';
        } else {
            bookBtn.innerHTML = '<i class="fa fa-heart-o"></i> Aggiungi al Ricettario';
            bookBtn.className = 'btn btn-default btn-block';
        }
    };

    updateBookBtnUI(userInteractions.saved);
    bookBtn.addEventListener('click', () => {
        updateBookBtnUI(PGRC.toggleRecipeInBook(mealId));
    });

    // Note Private
    const noteInput = document.getElementById('privateNoteInput');
    noteInput.value = userInteractions.note || "";
    document.getElementById('saveNoteBtn').addEventListener('click', () => {
        PGRC.savePrivateNote(mealId, noteInput.value);
        document.getElementById('noteStatus').style.display = 'inline';
        setTimeout(() => document.getElementById('noteStatus').style.display = 'none', 2000);
    });

    // Recensioni
    const renderReviews = (reviews) => {
        const list = document.getElementById('reviews-list');
        if (!reviews || reviews.length === 0) {
            list.innerHTML = '<p class="text-muted">Nessuna recensione.</p>';
            return;
        }
        list.innerHTML = reviews.map(r => `
            <div style="border-bottom: 1px solid #eee; margin-bottom: 5px; padding-bottom: 5px;">
                <small class="text-muted"><i class="fa fa-calendar"></i> ${r.date}</small><br>
                <span>Difficoltà: ${r.difficulty}/5</span> | <span>Gusto: ${r.taste}/5</span>
            </div>
        `).join('');
    };

    renderReviews(userInteractions.reviews);

    document.getElementById('addReviewForm').addEventListener('submit', (e) => {
        e.preventDefault();
        try {
            PGRC.addReview(mealId, document.getElementById('diffSelect').value, document.getElementById('tasteSelect').value);
            renderReviews(PGRC.getUserInteractions(mealId).reviews);
        } catch(err) { alert(err.message); }
    });
}

// ==========================================
// 5. EVENT LISTENER (FORM)
// ==========================================

function setupEventListeners() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            const input = document.getElementById('searchInput').value;
            if (!input.trim()) {
                e.preventDefault();
            } else {
                document.getElementById('searchInput').name = "search";
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUser').value;
            const pass = document.getElementById('loginPass').value;

            try {
                PGRC.login(user, pass);
                window.location.href = 'my_recipes.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('regUser').value;
            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPass').value;
            const pref = document.getElementById('regPref').value.split(',');

            try {
                PGRC.register(user, email, pass, pref);
                alert("Registrazione completata! Ora puoi fare il login.");
                window.location.href = 'login.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // ---- Load More Button ----
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            const originalText = loadMoreBtn.innerHTML;
            loadMoreBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Caricamento...';
            loadMoreBtn.disabled = true;

            try {
                // Lancia 6 chiamate asincrone alle API per prendere 6 nuove ricette random
                const promises = [];
                for(let i = 0; i < 6; i++) {
                    promises.push(fetch(`https://www.themealdb.com/api/json/v1/1/random.php`).then(res => res.json()));
                }
                const results = await Promise.all(promises);

                const newRecipes = [];
                const db = JSON.parse(localStorage.getItem('pgrc_db')) || { recipes: {} };

                results.forEach(data => {
                    if (data.meals && data.meals[0]) {
                        const meal = data.meals[0];
                        db.recipes[meal.idMeal] = meal; // Salva la nuova ricetta nel DB locale
                        newRecipes.push(meal); // Aggiunge all'array da renderizzare
                    }
                });

                // Aggiorna il Web Storage così le nuove ricette sono persistenti
                localStorage.setItem('pgrc_db', JSON.stringify(db));

                // Aggiunge le card alla griglia senza cancellare le vecchie
                appendRecipesToGrid(newRecipes, 'recipe-container');

            } catch (error) {
                console.error("Errore API Load More:", error);
                alert("Errore di connessione. Riprova più tardi.");
            } finally {
                loadMoreBtn.innerHTML = originalText;
                loadMoreBtn.disabled = false;
            }
        });
    }
}
