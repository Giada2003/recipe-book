<?php
// This file handles data storage using a JSON file.
date_default_timezone_set('UTC');

function get_db_path() {
    return __DIR__ . '/database.json';
}

// Reads the entire database from the JSON file.
// Creates and seeds the database if it doesn't exist.
function get_db() {
    $db_path = get_db_path();
    if (!file_exists($db_path)) {
        // Initial structure
        $db = ['users' => [], 'meals' => []];

        // Seed default user
        $passwordHash = password_hash('demo123', PASSWORD_DEFAULT);
        $defaultUserId = 1;
        $db['users'][] = [
            'id' => $defaultUserId,
            'username' => 'demo',
            'password' => $passwordHash
        ];

        save_db($db);
        return $db;
    }

    $json_data = file_get_contents($db_path);
    $db = json_decode($json_data, true);

    // One-time migration from 'recipes' to 'meals'
    if (isset($db['recipes']) && !isset($db['meals'])) {
        $db['meals'] = [];
        foreach ($db['recipes'] as $recipe) {
            $new_meal = get_empty_meal_structure();
            $new_meal['idMeal'] = strval($recipe['id']);
            $new_meal['userId'] = $recipe['user_id'];
            $new_meal['strMeal'] = $recipe['title'];
            $new_meal['strCategory'] = $recipe['description']; // Using old description as category
            $new_meal['strMealThumb'] = $recipe['image_url'];
            $new_meal['dateModified'] = date('Y-m-d H:i:s');

            $instructions = [];
            if(!empty($recipe['prep_time'])) $instructions[] = "Prep Time: " . $recipe['prep_time'];
            if(!empty($recipe['difficulty'])) $instructions[] = "Difficulty: " . $recipe['difficulty'];
            if(!empty($recipe['servings'])) $instructions[] = "Servings: " . $recipe['servings'];
            $instructions_str = implode("\n", $instructions);

            $new_meal['strInstructions'] = $instructions_str . "\n\n" . $recipe['directions'];

            $ingredient_lines = explode("\n", $recipe['ingredients']);
            $i = 1;
            foreach ($ingredient_lines as $line) {
                if ($i > 20 || empty(trim($line))) continue;
                $parts = preg_split('/\\s+/', trim($line), 2);
                $new_meal['strMeasure' . $i] = count($parts) > 1 ? $parts[0] : '';
                $new_meal['strIngredient' . $i] = count($parts) > 1 ? $parts[1] : $parts[0];
                $i++;
            }
            $db['meals'][] = $new_meal;
        }
        unset($db['recipes']);
        save_db($db);
    }

    return $db;
}

// Writes the entire database to the JSON file.
function save_db($data) {
    $db_path = get_db_path();
    $json_data = json_encode($data, JSON_PRETTY_PRINT);
    file_put_contents($db_path, $json_data);
}

// Finds the next available ID for a new item in a collection.
function get_next_id($collection) {
    if (empty($collection)) {
        return 1;
    }
    $max_id = 0;
    foreach ($collection as $item) {
        $id = intval($item['idMeal'] ?? ($item['id'] ?? 0));
        if ($id > $max_id) {
            $max_id = $id;
        }
    }
    return $max_id + 1;
}

// Returns an empty structure for a meal to ensure all fields exist.
function get_empty_meal_structure() {
    $structure = [
        'idMeal' => null, 'userId' => null, 'strMeal' => '', 'strMealAlternate' => null,
        'strCategory' => '', 'strArea' => '', 'strCountry' => '', 'strInstructions' => '',
        'strMealThumb' => '', 'strTags' => null, 'strYoutube' => '', 'strSource' => '',
        'strImageSource' => null, 'strCreativeCommonsConfirmed' => null, 'dateModified' => null
    ];
    for ($i = 1; $i <= 20; $i++) {
        $structure['strIngredient' . $i] = '';
        $structure['strMeasure' . $i] = '';
    }
    return $structure;
}
?>
