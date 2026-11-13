# 🍴 Recipe Book

A lightweight client-side web application for discovering, saving, and managing cooking recipes.

Allows users to search for recipes, view detailed recipe information, create a personal recipe book, add private notes, and rate recipes by difficulty and taste.

Recipe data is retrieved from [TheMealDB](https://www.themealdb.com/), while user data and personal recipes are stored locally in the browser.

---

## ✨ Features

* 🔎 Search recipes by name, ingredient, description text, or first letter
* 🍲 Browse randomly selected recipes
* 📖 View detailed recipe information
* ❤️ Save recipes to a personal recipe book
* 🗑️ Remove recipes from a personal recipe book
* 📝 Add private notes to recipes
* ⭐ Rate recipes by:

  * Difficulty
  * Taste
* 🌍 View public reviews, choose their date, and remove your own reviews
* 👤 Register and log in to a local account
* ✏️ Update account details and delete an account
* 🚪 Login/logout management
* 💾 Persistent browser storage using `localStorage`
* 📱 Responsive interface

---

## 🏗️ Architecture

The application is entirely client-side and is built around three main components:

```text
┌──────────────────────┐
│       HTML Pages     │
│  UI / Application    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     UI Controller    │
│   ui-controller.js   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     PGRC Core        │
│    pgrc-core.js      │
└───────┬───────┬──────┘
        │       │
        ▼       ▼
  localStorage  TheMealDB API
```

### Main components

**`pgrc-core.js`**

Contains the application's core logic:

* User registration and authentication
* Account detail updates and deletion
* Recipe retrieval and search
* Local recipe storage
* Personal recipe books
* Notes
* Reviews

**`ui-controller.js`**

Connects the core logic with the HTML interface and handles:

* Page initialization
* Navigation
* Recipe rendering
* Search
* Login and registration forms
* Recipe-book interactions
* Notes and reviews

---

## 📁 Project Structure

```text
recipe-book/
│
├── index.html              # Homepage and recipe search
├── login.html              # Login page
├── register.html           # Registration page
├── recipe.html             # Recipe details
├── my_recipes.html         # Personal recipe book
├── edit_user.html          # Account details and account deletion
│
├── css/
│   ├── bootstrap.min.css
│   ├── font-awesome.min.css
│   └── styles.css
│
├── js/
│   ├── pgrc-core.js        # Core application logic
│   └── ui-controller.js    # UI and page controller
│
├── images/                 # Images and visual assets
└── fonts/                  # Font assets
```

---

## 🛠️ Technologies

| Technology     | Purpose                   |
| -------------- | ------------------------- |
| HTML5          | Application structure     |
| CSS3           | Custom styling            |
| JavaScript     | Application logic         |
| Bootstrap      | Responsive layout         |
| Font Awesome   | Icons                     |
| TheMealDB API  | Recipe data               |
| `localStorage` | Local persistence         |

---

## 🚀 Getting Started

### Requirements

* A modern web browser
* Internet connection for recipe API requests
* Python 3, or another local HTTP server

### Clone the repository

```bash
git clone https://github.com/Giada2003/recipe-book.git
cd recipe-book
```

### Start a local server

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

## 📖 Usage

### Search for a recipe

Use the search bar on the homepage to search TheMealDB by recipe name, ingredient, or first letter. Description-text searches match recipes already cached in the browser.

### View a recipe

Select a recipe card to open its detailed page, including:

* Ingredients
* Measurements
* Preparation instructions
* Category
* Cuisine
* Recipe image

### Create an account

Use the **Register** page to create a local account.

### Save a recipe

While logged in, select **Add to Recipe Book** on a recipe.

Saved recipes are available from **My Recipe Book**.
Select **Remove from Recipe Book** on a saved recipe to remove it.

### Add a note

Recipe pages allow authenticated users to add, edit, and delete a private note attached to a recipe. The recipe data from TheMealDB is read-only; this note is the user-editable part of a saved recipe, while the recipe book supports adding and removing recipes.

### Rate a recipe

Users can rate recipes on two five-point scales:

* **Difficulty**
* **Taste**

Reviews are visible to all visitors. Logged-in users enter the dish preparation date (today or earlier) and can remove reviews they authored.

### Manage an account

From **Edit User**, users can update their username, email, and favorite dishes, optionally change their password, or delete their account.

---

## 💾 Data Storage

The application stores its data locally using the browser's `localStorage`.

The main database is stored under:

```text
pgrc_db
```

It contains:

```text
pgrc_db
├── users
├── recipes
├── interactions
├── reviews
├── loadedRecipeLetters
└── currentUser
```

This allows recipe data, user accounts, saved recipes, notes, and reviews to persist between browser sessions.

Passwords are stored as PBKDF2-SHA256 hashes with a unique random salt and 600,000 iterations. Existing plaintext passwords are hashed at startup. Since this is a client-side application, this does not replace server-side authentication or protect data from someone who can modify the browser storage.

---

## 🌐 TheMealDB API

PGRC uses [TheMealDB](https://www.themealdb.com/) to retrieve recipe information.

Main endpoints include:

```text
/random.php
/search.php?s=<query>
/filter.php?i=<ingredient>
/lookup.php?i=<meal_id>
```

Recipe results are also cached locally to reduce repeated requests.

---

## 👤 User Workflow

```text
Register
   │
   ▼
Login
   │
   ▼
Search / Browse Recipes
   │
   ▼
View Recipe
   │
   ├── Save to Recipe Book
   ├── Add Private Note
   └── Add Review
            │
            ▼
       My Recipe Book
```

---

## 📌 Core Pages

| Page              | Description                     |
| ----------------- | ------------------------------- |
| `index.html`      | Recipe discovery and search     |
| `login.html`      | User login                      |
| `register.html`   | Account registration            |
| `recipe.html`     | Recipe details and interactions |
| `my_recipes.html` | Personal recipe book            |
| `edit_user.html`  | Account details and deletion    |
