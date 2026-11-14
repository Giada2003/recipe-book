/**
 * Piattaforma per la Gestione di Ricette di Cucina
 * UI Controller - Gestione DOM, Eventi e Rendering
 */

const HOME_RECIPES_PAGE_SIZE = 6;
let homeRecipeCatalog = [];
let homeRecipeOffset = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // Il core deve validare lo storage e preparare il catalogo prima che la UI
    // legga i dati dell'utente o mostri le ricette disponibili.
    let startupError = null;
    try {
        await PGRC.startup();
    } catch (error) {
        // Dati locali non leggibili compromettono tutte le pagine; un errore
        // API, invece, consente ancora di usare una cache già presente.
        if (error.code === 'STORAGE') {
            renderGlobalError(error);
            return;
        }
        startupError = error;
        console.error("Errore di inizializzazione:", error);
    }

    // La navigazione viene costruita in base alla sessione locale attuale.
    try {
        updateNavbarUI();
    } catch (error) {
        renderGlobalError(error);
        return;
    }

    // Le pagine condividono questo controller: la presenza del contenitore
    // identifica quale inizializzatore eseguire senza dipendere dal pathname.
    if (document.getElementById('recipe-container')) {
        // Siamo in index.html (Homepage pubblica)
        handleSearchAndRendering(startupError);
    }
    else if (document.getElementById('my-recipes-container')) {
        // Siamo in my_recipes.html (Ricettario protetto)
        loadMyRecipesPage();
    }
    else if (document.getElementById('account-management-container')) {
        // Siamo in edit_user.html (Modifica utente protetta)
        loadAccountPage();
    }
    else if (document.getElementById('recipe-details-container')) {
        // Siamo in recipe.html (Dettaglio singola ricetta)
        initRecipePage();
    }

    // Registra i listener dopo aver inizializzato la pagina specifica.
    setupEventListeners();
});

/**
 * Traduce i codici d'errore del core in messaggi adatti all'interfaccia.
 * La distinzione tra rete, API, ricetta assente e storage evita di presentare
 * un guasto come se fosse una ricerca valida senza risultati.
 */
function getErrorMessage(error) {
    if (error.code === 'CONNECTION') return "Errore di connessione. Controlla la rete e riprova.";
    if (error.code === 'API_RESPONSE') return "Errore nella risposta API. Riprova più tardi.";
    if (error.code === 'RECIPE_NOT_FOUND') return "Questa ricetta non è più disponibile sull'API.";
    if (error.code === 'INCOMPLETE_STORAGE') return error.message;
    if (error.code === 'STORAGE') return error.message;
    return error.message || "Si è verificato un errore imprevisto.";
}

/**
 * Sostituisce il contenuto del contenitore con un messaggio testuale.
 * Il testo passa da textContent, così anche dati provenienti da API o storage
 * non vengono interpretati come markup.
 */
function renderMessage(container, message, className = 'col-12 text-center') {
    container.replaceChildren();
    const wrapper = document.createElement('div');
    wrapper.className = className;
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    wrapper.appendChild(paragraph);
    container.appendChild(wrapper);
}

/**
 * Mostra un avviso per le pagine protette e offre un collegamento all'accesso.
 * Il contenitore viene ripulito per non lasciare moduli o contenuti protetti
 * visibili quando manca una sessione autenticata.
 */
function renderLoginMessage(container, message) {
    container.replaceChildren();
    const wrapper = document.createElement('div');
    wrapper.className = 'text-center page-message';
    const heading = document.createElement('h4');
    heading.className = 'text-danger';
    heading.textContent = message;
    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.className = 'btn btn-primary';
    loginLink.textContent = 'Accedi';
    wrapper.append(heading, loginLink);
    container.appendChild(wrapper);
}

/**
 * Visualizza un errore che impedisce l'avvio completo della pagina.
 * Viene inserito all'inizio del body così il problema rimane visibile anche
 * quando non è possibile inizializzare il normale contenuto applicativo.
 */
function renderGlobalError(error) {
    const container = document.createElement('main');
    container.className = 'container app-error-message';
    const message = document.createElement('p');
    message.className = 'text-danger';
    message.textContent = getErrorMessage(error);
    container.appendChild(message);
    document.body.prepend(container);
}

// ==========================================
// 1. NAVBAR E HOMEPAGE (PUBBLICA)
// ==========================================

function updateNavbarUI() {
    const user = PGRC.getCurrentUser();
    const navUl = document.getElementById('main-navbar');

    if (!navUl) return;
    // Ricostruire la lista evita link duplicati e fa riflettere logout o
    // aggiornamenti dell'account effettuati durante la sessione.
    navUl.replaceChildren();

    // I link sono creati come nodi DOM e il testo non viene interpretato come HTML.
    const addLink = (text, href, id) => {
        const item = document.createElement('li');
        item.className = 'nav-item';
        const link = document.createElement('a');
        link.className = 'nav-link';
        link.href = href;
        link.textContent = text;
        if (id) link.id = id;
        item.appendChild(link);
        navUl.appendChild(item);
        return link;
    };

    if (user) {
        addLink('Home', 'index.html');
        addLink(`Il Mio Ricettario (${user.username})`, 'my_recipes.html');
        addLink('Modifica utente', 'edit_user.html');
        addLink('Logout', '#', 'js-logout').addEventListener('click', (e) => {
            e.preventDefault();
            // Il core elimina la sessione prima di ricaricare la home pubblica.
            PGRC.logout();
            window.location.href = 'index.html';
        });
    } else {
        addLink('Home', 'index.html');
        addLink('Login', 'login.html');
        addLink('Register', 'register.html');
    }
}

/**
 * Decide quale flusso di visualizzazione usare sulla home:
 * una ricerca richiesta dall'URL oppure una pagina del catalogo in cache.
 */
async function handleSearchAndRendering(startupError = null) {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const requestedSearchType = urlParams.get('type') || 'name';
    const supportedSearchTypes = ['name', 'ingredient', 'description', 'letter'];
    const searchType = supportedSearchTypes.includes(requestedSearchType) ? requestedSearchType : 'name';
    const loadMoreContainer = document.getElementById('load-more-container');

    if (searchQuery && searchQuery.trim() !== '') {
        // La paginazione del catalogo non deve aggiungere ricette ai risultati filtrati.
        if (loadMoreContainer) loadMoreContainer.classList.add('is-hidden');
        homeRecipeCatalog = [];
        homeRecipeOffset = 0;
        const typeSelect = document.getElementById('searchType');
        if (typeSelect) {
            typeSelect.value = searchType;
        }
        if (searchType === 'letter' && !/^[a-z]$/i.test(searchQuery.trim())) {
            // Le ricerche per iniziale accettano un solo carattere alfabetico.
            alert("Inserisci una sola lettera da A a Z.");
            renderRecipeGrid([], 'recipe-container');
            return;
        }
        try {
            const results = await PGRC.searchRecipes(searchQuery, searchType);
            renderRecipeGrid(results, 'recipe-container');
        } catch (error) {
            renderMessage(document.getElementById('recipe-container'), getErrorMessage(error), 'col-12 text-center alert alert-danger');
        }
    } else {
        try {
            // Un ordine stabile permette di sfogliare il catalogo senza
            // ripetizioni o salti causati da selezioni casuali.
            homeRecipeCatalog = PGRC.getCachedRecipes().sort((first, second) =>
                first.strMeal.localeCompare(second.strMeal, 'en', { sensitivity: 'base' })
            );
            homeRecipeOffset = 0;
            if (homeRecipeCatalog.length > 0) {
                const firstPage = homeRecipeCatalog.slice(0, HOME_RECIPES_PAGE_SIZE);
                homeRecipeOffset = firstPage.length;
                renderRecipeGrid(firstPage, 'recipe-container');
                if (loadMoreContainer) {
                    loadMoreContainer.classList.toggle('is-hidden', homeRecipeOffset >= homeRecipeCatalog.length);
                }
            } else if (startupError) {
                if (loadMoreContainer) loadMoreContainer.classList.add('is-hidden');
                // Mostra l'errore solo se l'avvio non ha lasciato ricette in cache.
                renderMessage(document.getElementById('recipe-container'), getErrorMessage(startupError), 'col-12 text-center alert alert-danger');
            } else {
                if (loadMoreContainer) loadMoreContainer.classList.add('is-hidden');
                // L'assenza di risultati è distinta da un errore API o di rete.
                renderMessage(document.getElementById('recipe-container'), "Nessuna ricetta trovata.");
            }
        } catch (error) {
            if (loadMoreContainer) loadMoreContainer.classList.add('is-hidden');
            renderMessage(document.getElementById('recipe-container'), getErrorMessage(error), 'col-12 text-center alert alert-danger');
        }
    }
}

// ==========================================
// 2. PAGINA RICETTARIO (PROTETTA)
// ==========================================

/**
 * Carica la raccolta personale dell'utente corrente.
 * Un archivio vuoto è uno stato normale; un errore nel recupero dei dati locali
 * viene invece mostrato come errore esplicito.
 */
function loadMyRecipesPage() {
    const user = PGRC.getCurrentUser();
    const container = document.getElementById('my-recipes-container');

    if (!user) {
        if (container) {
            renderLoginMessage(container, "Devi effettuare il login per vedere il tuo ricettario.");
        }
        return;
    }

    let savedRecipes;
    try {
        savedRecipes = PGRC.getPersonalRecipeBook();
    } catch (error) {
        renderMessage(container, getErrorMessage(error), 'col-12 text-center alert alert-danger');
        return;
    }
    if (savedRecipes.length === 0) {
        renderMessage(container, "Il tuo ricettario è vuoto! Torna in Home e salva qualche ricetta.");
        return;
    }
    renderRecipeGrid(savedRecipes, 'my-recipes-container');
}

/**
 * Precompila il modulo di modifica account con i dati non segreti dell'utente.
 * La password non viene precompilata nel campo: lasciandolo vuoto, l'utente
 * mantiene quella attuale.
 */
function loadAccountPage() {
    const user = PGRC.getCurrentUser();
    const container = document.getElementById('account-management-container');

    if (!user) {
        renderLoginMessage(container, "Devi effettuare il login per modificare i dati utente.");
        return;
    }

    document.getElementById('account-management').classList.remove('is-hidden');
    document.getElementById('accountUsername').value = user.username;
    document.getElementById('accountEmail').value = user.email;
    document.getElementById('accountPreferences').value = (user.preferences || []).join(', ');
}

// ==========================================
// 3. GENERATORE GRAFICO DI CARD
// ==========================================

/**
 * Sostituisce le card correnti con quelle ricevute e gestisce l'elenco vuoto.
 * Il flag delle ricette personali abilita nelle card il comando di rimozione.
 */
function renderRecipeGrid(recipes, targetContainerId) {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    container.replaceChildren();
    if (!Array.isArray(recipes) || recipes.length === 0) {
        renderMessage(container, "Nessuna ricetta trovata.");
        return;
    }

    recipes.forEach(meal => {
        container.appendChild(createRecipeCard(meal, targetContainerId === 'my-recipes-container'));
    });
}

/**
 * Aggiunge card a una griglia già renderizzata senza rimuovere quelle esistenti.
 * Viene usato dal caricamento incrementale della home.
 */
function appendRecipesToGrid(recipes, targetContainerId) {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    recipes.forEach(meal => container.appendChild(createRecipeCard(meal, false)));
}

/**
 * Crea una card usando solo nodi DOM; titoli e categorie API sono testo,
 * mentre l'immagine viene accettata solo se il suo URL usa HTTPS.
 */
function createRecipeCard(meal, isPersonalRecipe) {
    const column = document.createElement('div');
    column.className = 'col-lg-4 col-md-6 col-sm-12';

    const card = document.createElement('div');
    card.className = 'recipe-item recipe-card text-center';

    const link = document.createElement('a');
    link.href = `recipe.html?id=${encodeURIComponent(String(meal.idMeal))}`;
    const image = document.createElement('img');
    image.className = 'recipe-card-image';
    image.alt = meal.strMeal;
    if (typeof meal.strMealThumb === 'string') {
        try {
            const imageUrl = new URL(meal.strMealThumb);
            if (imageUrl.protocol === 'https:') image.src = imageUrl.href;
        } catch (error) {
            console.warn("URL immagine ricetta non valida:", error);
        }
    }
    link.appendChild(image);

    const title = document.createElement('h3');
    title.className = 'recipe-card-title';
    title.textContent = meal.strMeal;
    const category = document.createElement('p');
    category.className = 'text-muted';
    category.textContent = typeof meal.strCategory === 'string' && meal.strCategory.trim()
        ? meal.strCategory
        : 'Categoria non disponibile';

    card.append(link, title, category);
    if (isPersonalRecipe) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'btn btn-danger btn-sm remove-recipe-btn';
        removeButton.dataset.mealId = String(meal.idMeal);
        removeButton.textContent = 'Rimuovi dal ricettario';
        card.appendChild(removeButton);
    }

    column.appendChild(card);
    return column;
}

// ==========================================
// 4. PAGINA SINGOLA RICETTA (recipe.html)
// ==========================================

/**
 * Legge l'identificativo dalla query string, carica la ricetta tramite il core
 * e attiva le aree di interazione solo dopo aver mostrato un dettaglio valido.
 */
async function initRecipePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const mealId = urlParams.get('id');
    const container = document.getElementById('recipe-details-container');

    if (!mealId) {
        renderMessage(container, "Ricetta non trovata.", 'col-12 text-center');
        return;
    }

    let meal;
    try {
        meal = await PGRC.getRecipeById(mealId);
    } catch (error) {
        renderMessage(container, getErrorMessage(error), 'col-12 text-center alert alert-danger');
        return;
    }

    renderSingleRecipeHTML(meal);

    const user = PGRC.getCurrentUser();
    document.getElementById('interactions-area').classList.remove('is-hidden');
    setupRecipeReviews(mealId, user);
    if (user) {
        document.getElementById('private-note-area').classList.remove('is-hidden');
        setupRecipeInteractions(mealId);
    } else {
        document.getElementById('review-login-prompt').classList.remove('is-hidden');
    }
}

/**
 * Costruisce la vista del dettaglio senza concatenare valori API in HTML.
 * Immagine, ingredienti, metadati e istruzioni vengono aggiunti come nodi
 * separati; istruzioni e altri testi restano quindi contenuto letterale.
 */
function renderSingleRecipeHTML(meal) {
    const container = document.getElementById('recipe-details-container');
    container.replaceChildren();

    const imageColumn = document.createElement('div');
    imageColumn.className = 'col-md-4';
    const image = document.createElement('img');
    image.className = 'img-fluid recipe-main-img';
    image.alt = meal.strMeal;
    if (typeof meal.strMealThumb === 'string') {
        try {
            const imageUrl = new URL(meal.strMealThumb);
            // Non caricare immagini tramite protocolli diversi da HTTPS.
            if (imageUrl.protocol === 'https:') image.src = imageUrl.href;
            else image.classList.add('is-hidden');
        } catch (error) {
            image.classList.add('is-hidden');
            console.warn("URL immagine ricetta non valida:", error);
        }
    } else {
        image.classList.add('is-hidden');
    }

    const bookButton = document.createElement('button');
    bookButton.id = 'toggleBookBtn';
    bookButton.className = 'btn btn-secondary btn-block recipe-book-btn is-hidden';
    bookButton.type = 'button';
    const bookIcon = document.createElement('i');
    bookIcon.className = 'fa fa-heart-o';
    bookButton.append(bookIcon, document.createTextNode(' Caricamento...'));
    imageColumn.append(image, bookButton);

    const detailsColumn = document.createElement('div');
    detailsColumn.className = 'col-md-8';
    const title = document.createElement('h2');
    title.className = 'recipe-main-title';
    title.textContent = meal.strMeal;
    detailsColumn.appendChild(title);

    const badges = document.createElement('div');
    badges.className = 'recipe-badges-container';
    badges.append(
        createRecipeBadge('fa fa-cutlery', meal.strCategory || 'Sconosciuta', 'badge-category'),
        createRecipeBadge('fa fa-globe', meal.strArea || 'Internazionale', 'badge-area')
    );
    detailsColumn.appendChild(badges);
    detailsColumn.appendChild(createRecipeSectionTitle('Ingredienti'));

    const ingredientsBox = document.createElement('div');
    ingredientsBox.className = 'content-box ingredients-box';
    for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (typeof ing === 'string' && ing.trim() !== '') {
            const ingredientItem = document.createElement('div');
            ingredientItem.className = 'ingredient-item';
            const measureLabel = document.createElement('span');
            measureLabel.className = 'text-muted';
            measureLabel.textContent = typeof measure === 'string' ? measure : '';
            ingredientItem.append(document.createTextNode(`${ing}: `), measureLabel);
            ingredientsBox.appendChild(ingredientItem);
        }
    }

    detailsColumn.appendChild(ingredientsBox);
    detailsColumn.appendChild(createRecipeSectionTitle('Preparazione'));
    const instructionsBox = document.createElement('div');
    instructionsBox.className = 'content-box';
    // L'API a volte antepone numerazioni o "Step n" alle righe: rimuovere
    // soltanto questo prefisso mantiene il testo utile e numerazione uniforme.
    const finalSteps = meal.strInstructions.split(/\r?\n/)
        .map(step => step.trim().replace(/^(?:step\s*\d+|\d+)\s*[:.\-)]?\s*/i, '').trim())
        .filter(Boolean);
    finalSteps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = 'prep-step';
        const stepLabel = document.createElement('div');
        stepLabel.className = 'step-label';
        stepLabel.textContent = `step ${index + 1}`;
        const stepText = document.createElement('p');
        stepText.textContent = step;
        stepElement.append(stepLabel, stepText);
        instructionsBox.appendChild(stepElement);
    });
    detailsColumn.appendChild(instructionsBox);
    container.append(imageColumn, detailsColumn);
}

/**
 * Crea un'etichetta con icona e testo come nodi distinti, evitando markup
 * costruito a partire da categoria o area restituite dall'API.
 */
function createRecipeBadge(iconClass, label, badgeClass) {
    const badge = document.createElement('span');
    badge.className = `recipe-badge ${badgeClass}`;
    const icon = document.createElement('i');
    icon.className = iconClass;
    badge.append(icon, document.createTextNode(` ${label}`));
    return badge;
}

/**
 * Restituisce un titolo di sezione riutilizzabile per ingredienti e preparazione.
 */
function createRecipeSectionTitle(label) {
    const heading = document.createElement('h3');
    heading.className = 'recipe-section-title';
    heading.textContent = label;
    return heading;
}

/**
 * Collega alla ricetta le azioni private dell'utente: aggiunta al ricettario,
 * salvataggio della nota e rimozione esplicita della nota.
 */
function setupRecipeInteractions(mealId) {
    const userInteractions = PGRC.getUserInteractions(mealId);

    // Bottone Ricettario
    const bookBtn = document.getElementById('toggleBookBtn');
    bookBtn.classList.remove('is-hidden');

    const updateBookBtnUI = (isSaved) => {
        const icon = document.createElement('i');
        if (isSaved) {
            icon.className = 'fa fa-heart';
            bookBtn.className = 'btn btn-danger btn-block';
            bookBtn.replaceChildren(icon, document.createTextNode(' Rimuovi dal Ricettario'));
        } else {
            icon.className = 'fa fa-heart-o';
            bookBtn.className = 'btn btn-secondary btn-block';
            bookBtn.replaceChildren(icon, document.createTextNode(' Aggiungi al Ricettario'));
        }
    };

    // Il testo e l'icona riflettono sempre lo stato restituito dal core.
    updateBookBtnUI(userInteractions.saved);
    bookBtn.addEventListener('click', () => {
        updateBookBtnUI(PGRC.toggleRecipeInBook(mealId));
    });

    // Note Private
    const noteInput = document.getElementById('privateNoteInput');
    noteInput.value = userInteractions.note || "";
    const noteStatus = document.getElementById('noteStatus');
    const showNoteStatus = message => {
        noteStatus.textContent = message;
        noteStatus.classList.remove('is-hidden');
        // Il feedback è temporaneo e non interferisce con il contenuto della nota.
        setTimeout(() => noteStatus.classList.add('is-hidden'), 2000);
    };

    document.getElementById('saveNoteBtn').addEventListener('click', () => {
        PGRC.savePrivateNote(mealId, noteInput.value);
        showNoteStatus('Salvata!');
    });

    document.getElementById('deleteNoteBtn').addEventListener('click', () => {
        // Richiedere conferma evita di cancellare la nota con un click involontario.
        if (!window.confirm("Vuoi eliminare la nota privata per questa ricetta?")) return;

        PGRC.deletePrivateNote(mealId);
        noteInput.value = '';
        showNoteStatus('Nota eliminata.');
    });
}

/**
 * Mostra le recensioni pubbliche e, se l'utente è autenticato, abilita
 * l'inserimento e la rimozione delle sole recensioni che gli appartengono.
 */
function setupRecipeReviews(mealId, user) {
    const list = document.getElementById('reviews-list');
    const formArea = document.getElementById('review-form-area');
    const reviewForm = document.getElementById('addReviewForm');
    const reviewDate = document.getElementById('reviewDate');
    const today = new Date();
    // Impedisce di selezionare dal form una data di preparazione futura.
    reviewDate.max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Rigenera l'elenco dopo ogni modifica, lasciando al core la verifica
    // dell'autore e la persistenza dei dati.
    const renderReviews = () => {
        const reviews = PGRC.getReviews(mealId);
        list.replaceChildren();
        if (reviews.length === 0) {
            list.textContent = 'Nessuna recensione.';
            return;
        }

        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-item';

            const authorAndDate = document.createElement('small');
            authorAndDate.className = 'text-muted';
            authorAndDate.textContent = `${review.username} · ${review.date}`;
            reviewElement.appendChild(authorAndDate);

            const ratings = document.createElement('div');
            ratings.textContent = `Difficoltà: ${review.difficulty}/5 | Gusto: ${review.taste}/5`;
            reviewElement.appendChild(ratings);

            if (user && review.username === user.username) {
                // Il controllo dell'autore viene ripetuto anche dal core
                // quando il pulsante viene attivato.
                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'btn btn-link btn-xs';
                removeButton.textContent = 'Rimuovi la tua recensione';
                removeButton.addEventListener('click', () => {
                    try {
                        if (!PGRC.removeReview(mealId, review.id)) {
                            alert("Non è stato possibile rimuovere la recensione.");
                            return;
                        }
                        renderReviews();
                    } catch (error) {
                        alert(error.message);
                    }
                });
                reviewElement.appendChild(removeButton);
            }

            list.appendChild(reviewElement);
        });
    };

    renderReviews();
    if (user) formArea.classList.remove('is-hidden');

    // Le date e i voti inseriti vengono validati e salvati dal core.
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
            PGRC.addReview(
                mealId,
                reviewDate.value,
                document.getElementById('diffSelect').value,
                document.getElementById('tasteSelect').value
            );
            reviewForm.reset();
            renderReviews();
        } catch (error) {
            alert(error.message);
        }
    });
}

// ==========================================
// 5. EVENT LISTENER (FORM)
// ==========================================

/**
 * Registra i listener solo sugli elementi presenti nella pagina corrente.
 * La verifica dei nodi consente allo stesso controller di essere incluso
 * in più pagine senza richiedere markup duplicato.
 */
function setupEventListeners() {
    const myRecipesContainer = document.getElementById('my-recipes-container');
    if (myRecipesContainer) {
        // Listener delegato: le card vengono ricreate dopo ogni rimozione,
        // ma il contenitore resta stabile e continua a ricevere i click.
        myRecipesContainer.addEventListener('click', (e) => {
            const removeButton = e.target.closest('.remove-recipe-btn');
            if (!removeButton) return;

            // Alterna lo stato salvato nel core e ridisegna l'elenco aggiornato.
            PGRC.toggleRecipeInBook(removeButton.dataset.mealId);
            loadMyRecipesPage();
        });
    }

    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Il campo password è opzionale: il core la cambia solo se valorizzata.
            const username = document.getElementById('accountUsername').value;
            const email = document.getElementById('accountEmail').value;
            const password = document.getElementById('accountPassword').value;
            const preferences = document.getElementById('accountPreferences').value
                .split(',')
                .map(preference => preference.trim())
                .filter(Boolean);

            try {
                // L'aggiornamento è asincrono perché il core protegge la password
                // con hashing prima di persistere i nuovi dati.
                await PGRC.updateUserData(username, email, password, preferences);
                document.getElementById('accountPassword').value = '';
                updateNavbarUI();
                alert("Dati utente aggiornati.");
            } catch (error) {
                alert(error.message);
            }
        });
    }

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            // La cancellazione è irreversibile, quindi richiede conferma esplicita.
            if (!window.confirm("Vuoi davvero eliminare il tuo account? Questa operazione non può essere annullata.")) {
                return;
            }

            if (PGRC.deleteAccount()) {
                window.location.href = 'index.html';
            } else {
                alert("Impossibile eliminare l'account: nessun utente è autenticato.");
            }
        });
    }

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        const searchInput = document.getElementById('searchInput');
        const searchType = document.getElementById('searchType');
        // Aggiorna i suggerimenti e i vincoli del campo quando cambia la modalità.
        const updateSearchInput = () => {
            const isLetterSearch = searchType.value === 'letter';
            searchInput.placeholder = isLetterSearch
                ? 'Inserisci una lettera (A-Z)...'
                : searchType.value === 'ingredient'
                    ? 'Es. chicken, tomato...'
                    : searchType.value === 'description'
                        ? 'Cerca nelle descrizioni caricate...'
                        : 'Cerca una ricetta...';

            if (isLetterSearch) {
                searchInput.maxLength = 1;
                searchInput.pattern = '[A-Za-z]';
                searchInput.title = 'Inserisci una sola lettera da A a Z.';
            } else {
                searchInput.removeAttribute('maxlength');
                searchInput.removeAttribute('pattern');
                searchInput.removeAttribute('title');
            }
        };

        searchType.addEventListener('change', updateSearchInput);
        updateSearchInput();

        searchForm.addEventListener('submit', (e) => {
            const input = searchInput.value.trim();
            // Evita una navigazione con parametro vuoto, che non corrisponde
            // a una richiesta di ricerca valida.
            if (!input.trim()) {
                e.preventDefault();
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUser').value;
            const pass = document.getElementById('loginPass').value;

            try {
                // Il login verifica la password nel core e poi apre il ricettario.
                await PGRC.login(user, pass);
                window.location.href = 'my_recipes.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('regUser').value;
            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPass').value;
            const pref = document.getElementById('regPref').value.split(',');

            try {
                // La registrazione salva i dati tramite il core; l'accesso viene
                // richiesto separatamente dopo la conferma all'utente.
                await PGRC.register(user, email, pass, pref);
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
            // Conserva una copia dei nodi originali per ripristinare esattamente
            // il pulsante anche se la richiesta API termina con un errore.
            const originalContent = Array.from(loadMoreBtn.childNodes, node => node.cloneNode(true));
            const spinner = document.createElement('i');
            spinner.className = 'fa fa-spinner fa-spin';
            loadMoreBtn.replaceChildren(spinner, document.createTextNode(' Caricamento...'));
            loadMoreBtn.disabled = true;

            try {
                // Consuma la pagina successiva del catalogo già in cache.
                const nextRecipes = homeRecipeCatalog.slice(
                    homeRecipeOffset,
                    homeRecipeOffset + HOME_RECIPES_PAGE_SIZE
                );
                appendRecipesToGrid(nextRecipes, 'recipe-container');
                homeRecipeOffset += nextRecipes.length;
                if (homeRecipeOffset >= homeRecipeCatalog.length) {
                    document.getElementById('load-more-container').classList.add('is-hidden');
                }
            } catch (error) {
                alert(getErrorMessage(error));
            } finally {
                // Il finally garantisce il ripristino dello stato interattivo.
                loadMoreBtn.replaceChildren(...originalContent);
                loadMoreBtn.disabled = false;
            }
        });
    }
}
