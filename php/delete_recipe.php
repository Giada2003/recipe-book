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

    if (!empty($recipe_id)) {
        $db = get_db();
        $meal_index_to_delete = -1;

        // Find the recipe and verify ownership
        foreach ($db['meals'] as $index => $meal) {
            if ($meal['idMeal'] == $recipe_id) {
                // Check for ownership. Only owners can delete.
                if (isset($meal['userId']) && $meal['userId'] == $user_id) {
                    $meal_index_to_delete = $index;
                }
                break;
            }
        }

        // If meal was found and user is the owner, proceed with deletion
        if ($meal_index_to_delete !== -1) {
            // 1. Remove the meal from the main meals array
            array_splice($db['meals'], $meal_index_to_delete, 1);

            // 2. Remove the meal ID from any user's savedMeals array
            foreach ($db['users'] as &$user) {
                if (isset($user['savedMeals'])) {
                    $saved_index = array_search($recipe_id, $user['savedMeals']);
                    if ($saved_index !== false) {
                        array_splice($user['savedMeals'], $saved_index, 1);
                    }
                }
            }
            unset($user);

            // 3. Save the updated database
            save_db($db);

            // Redirect to the user's recipes page
            header("Location: my_recipes.php");
            exit;
        }
    }
}

// If something went wrong or it's not a POST request, redirect to homepage.
header("Location: ../index.php");
exit;
?>
