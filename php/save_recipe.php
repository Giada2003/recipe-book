<?php
session_start();
require_once 'database.php';

// Redirect to login if user is not authenticated
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_id'];
    $recipe_id = $_POST['recipe_id'] ?? '';
    $action = $_POST['action'] ?? '';

    if (!empty($recipe_id) && ($action === 'save' || $action === 'unsave')) {
        $db = get_db();
        $recipe_found = false;

        // Check if recipe exists
        foreach ($db['meals'] as $meal) {
            if ($meal['idMeal'] == $recipe_id) {
                $recipe_found = true;
                break;
            }
        }

        if ($recipe_found) {
            foreach ($db['users'] as &$user) {
                if ($user['id'] == $user_id) {
                    if (!isset($user['savedMeals'])) {
                        $user['savedMeals'] = [];
                    }
                    $saved_index = array_search($recipe_id, $user['savedMeals']);
                    if ($action === 'save' && $saved_index === false) {
                        $user['savedMeals'][] = $recipe_id;
                    } elseif ($action === 'unsave' && $saved_index !== false) {
                        array_splice($user['savedMeals'], $saved_index, 1);
                    }
                    break;
                }
            }
            save_db($db);
        }
    }
    header("Location: recipe.php?id=" . urlencode($recipe_id));
    exit;
}

header("Location: ../index.php");
exit;
?>
