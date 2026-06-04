<?php
// my_recipes.php
// User's personal dashboard to view and add their own recipes
session_start();
require_once 'database.php';

// Redirect to login if user is not authenticated
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];
$username = $_SESSION['username'];

// Handle new recipe submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_recipe') {
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $area = trim($_POST['area'] ?? '');
    $country = trim($_POST['country'] ?? '');
    $tags = trim($_POST['tags'] ?? '');
    $ingredients = trim($_POST['ingredients'] ?? '');
    $directions = trim($_POST['directions'] ?? '');
    $image_url = trim($_POST['image_url'] ?? 'images/bbq-pork-ribs.jpg');

    if (!empty($title)) {
        $db = get_db();
        $new_meal_id = get_next_id($db['meals']);

        $new_meal = get_empty_meal_structure();
        $new_meal['idMeal'] = strval($new_meal_id);
        $new_meal['userId'] = $user_id;
        $new_meal['strMeal'] = $title;
        $new_meal['strCategory'] = $description;
        $new_meal['strArea'] = $area;
        $new_meal['strCountry'] = $country;
        $new_meal['strTags'] = $tags;
        $new_meal['strMealThumb'] = $image_url;
        $new_meal['dateModified'] = date('Y-m-d H:i:s');

        $new_meal['strInstructions'] = $directions;

        $ingredient_lines = explode("\n", $ingredients);
        $i = 1;
        foreach ($ingredient_lines as $line) {
            if ($i > 20 || empty(trim($line))) continue;
            $parts = preg_split('/\\s+/', trim($line), 2);
            if (count($parts) > 1) {
                $new_meal['strMeasure' . $i] = $parts[0];
                $new_meal['strIngredient' . $i] = $parts[1];
            } else {
                $new_meal['strMeasure' . $i] = '';
                $new_meal['strIngredient' . $i] = $parts[0];
            }
            $i++;
        }

        $db['meals'][] = $new_meal;

        save_db($db);

        // Refresh page to prevent re-submission
        header("Location: my_recipes.php");
        exit;
    }
}
$db = get_db();
// Find current user's saved meals
$saved_meal_ids = [];
foreach ($db['users'] as $user) {
    if ($user['id'] == $user_id) {
        if (isset($user['savedMeals'])) {
            $saved_meal_ids = $user['savedMeals'];
        }
        break;
    }
}

// Filter meals: either created by user OR saved by user
$user_meals = array_filter($db['meals'] ?? [], fn($meal) => (isset($meal['userId']) && $meal['userId'] == $user_id) || in_array($meal['idMeal'], $saved_meal_ids));

usort($user_meals, fn($a, $b) => intval($b['idMeal']) <=> intval($a['idMeal']));
$recipes = $user_meals;
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My Recipes - Recipe Book</title>

  <link rel="stylesheet" type="text/css" href="../css/reset.css" />
  <link rel="stylesheet" type="text/css" href="../css/bootstrap.min.css" />
  <link rel="stylesheet" type="text/css" href="../css/font-awesome.min.css"  />
  <link rel="stylesheet" type="text/css" href="../css/styles.css" />
</head>
<body>
  <!-- Header / Navigation -->
  <nav class="navbar navbar-default">
    <div class="container-fluid">
      <div class="navbar-header">
        <a class="navbar-brand" href="../index.php">Recipe Book</a>
      </div>
      <ul class="nav navbar-nav navbar-right">
        <li><a href="../index.php">Home</a></li>
        <li class="active"><a href="my_recipes.php">My Recipes (<?php echo htmlspecialchars($username); ?>)</a></li>
        <li><a href="logout.php">Logout</a></li>
      </ul>
    </div>
  </nav>

  <div class="container" style="padding: 30px 0;">
    <div class="row">
      <!-- Add Recipe Form Column -->
      <div class="col-md-4">
        <div class="panel panel-info">
          <div class="panel-heading">
            <h3 class="panel-title">Add New Recipe</h3>
          </div>
          <div class="panel-body">
            <form method="POST" action="my_recipes.php">
              <input type="hidden" name="action" value="add_recipe">
              <div class="form-group">
                <label for="title">Recipe Title</label>
                <input type="text" class="form-control" id="title" name="title" required>
              </div>
              <div class="form-group">
                <label for="description">Category</label>
                <input type="text" class="form-control" id="description" name="description" placeholder="e.g., Dessert">
              </div>
              <div class="form-group">
                <label for="area">Area</label>
                <input type="text" class="form-control" id="area" name="area" placeholder="e.g., British">
              </div>
              <div class="form-group">
                <label for="country">Country</label>
                <input type="text" class="form-control" id="country" name="country" placeholder="e.g., United Kingdom">
              </div>
              <div class="form-group">
                <label for="tags">Tags (comma-separated)</label>
                <input type="text" class="form-control" id="tags" name="tags" placeholder="e.g., Cake,Pudding,Dessert">
              </div>
              <div class="form-group">
                <label for="ingredients">Ingredients</label>
                <textarea class="form-control" id="ingredients" name="ingredients" rows="4" placeholder="e.g., 250g Butter (one per line)"></textarea>
              </div>
              <div class="form-group">
                <label for="directions">Directions</label>
                <textarea class="form-control" id="directions" name="directions" rows="4" placeholder="List directions, one step per line"></textarea>
              </div>
              <div class="form-group">
                <label for="image_url">Image URL (Optional)</label>
                <input type="text" class="form-control" id="image_url" name="image_url" placeholder="e.g., ../images/pizza.jpg">
              </div>
              <button type="submit" class="btn btn-success btn-block">Add Recipe</button>
            </form>
          </div>
        </div>
      </div>

      <!-- User's Recipes List Column -->
      <div class="col-md-8">
        <h2>My Saved Recipes</h2>
        <hr>
        <div class="row">
          <?php if (!empty($recipes)): ?>
            <?php foreach ($recipes as $recipe): ?>
              <div class="col-md-6 col-sm-6">
                <div class="recipe-item text-center" style="margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
                  <!-- Link to a detail page (optional, we reuse recipe.php here as a placeholder) -->
                  <?php
                  $recipeImageUrl = $recipe['strMealThumb'];
                  if (empty($recipeImageUrl)) {
                      $recipeImageUrl = '../images/bbq-pork-ribs.jpg';
                  } elseif (strpos($recipeImageUrl, 'http') !== 0 && strpos($recipeImageUrl, '../') !== 0) {
                      // Not a full URL and not already relative from current dir.
                      $recipeImageUrl = '../' . $recipeImageUrl;
                  }
              ?>
              <a href="recipe.php?id=<?php echo htmlspecialchars($recipe['idMeal']); ?>">
                    <img src="<?php echo htmlspecialchars($recipeImageUrl); ?>" alt="<?php echo htmlspecialchars($recipe['strMeal']); ?>" class="img-responsive" style="margin: 0 auto; max-height: 200px; object-fit: cover;" />
                  </a>
                  <h3 style="margin-top: 15px; font-size: 1.2em;"><?php echo htmlspecialchars($recipe['strMeal']); ?></h3>
                  <p class="text-muted">
                    <?php
                      if (!empty($recipe['strCategory'])) {
                          echo htmlspecialchars(substr($recipe['strCategory'], 0, 50)) . '...';
                      } elseif (!empty($recipe['strInstructions'])) {
                          echo htmlspecialchars(substr($recipe['strInstructions'], 0, 50)) . '...';
                      }
                    ?>
                  </p>
                  <p class="text-muted" style="font-size: 0.9em;">
                    Category: <strong><?php echo htmlspecialchars($recipe['strCategory'] ?: 'N/A'); ?></strong>
                  </p>
                </div>
              </div>
            <?php endforeach; ?>
          <?php else: ?>
            <div class="col-12 text-center">
              <p>You haven't added any recipes yet. Start adding them from the left menu!</p>
            </div>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>

  <script charset="utf-8" src="../js/jquery-3.3.1.min.js"></script>
  <script charset="utf-8" src="../js/bootstrap.min.js"></script>
</body>
</html>
