<?php
// Start the session to access session variables like user ID.
session_start();
// Include the database functions file.
require_once 'database.php';

// Get the recipe ID from the URL query string.
$recipe_id = $_GET['id'] ?? '';
// If the recipe ID is empty, redirect to the homepage.
if (empty($recipe_id)) {
    header('Location: ../index.php');
    exit;
}

// Get the entire database.
$db = get_db();
// Filter the meals array to find the meal with the matching ID.
$meals = array_filter($db['meals'] ?? [], fn($m) => $m['idMeal'] == $recipe_id);
// Get the first element from the filtered array, which should be our recipe.
$recipe = current($meals); // Get the first match

// If no recipe was found with that ID, redirect to the homepage.
if (!$recipe) {
    // Recipe not found, redirect to home
    header('Location: ../index.php');
    exit;
}

// Initialize flags for user-specific states.
// Check if user has saved this recipe
$is_saved = false;
// Check if the current user is the owner of the recipe.
$is_owner = false;
// Check if a user is logged in.
if (isset($_SESSION['user_id'])) {
    // Get the current user's ID from the session.
    $current_user_id = $_SESSION['user_id'];
    // Check if the recipe has a userId and if it matches the current user's ID.
    if (isset($recipe['userId']) && $recipe['userId'] == $current_user_id) {
        $is_owner = true;
    }

    // Loop through the users in the database to find the current user.
    foreach ($db['users'] as $user) {
        // If the user ID matches the current user's ID.
        if ($user['id'] == $current_user_id) {
            // Check if the user has a 'savedMeals' array and if the current recipe ID is in it.
            if (isset($user['savedMeals']) && in_array($recipe['idMeal'], $user['savedMeals'])) {
                $is_saved = true;
            }
            // Stop looping once the user is found.
            break;
        }
    }
}

// Sanitize and prepare recipe data for display
// Sanitize the recipe title for HTML output.
$title = htmlspecialchars($recipe['strMeal']);
// Sanitize the recipe category for HTML output.
$description = htmlspecialchars($recipe['strCategory']);
// Set a default image if none is provided, otherwise use the one from the recipe.
$image_url = $recipe['strMealThumb'] ?: 'images/bbq-pork-ribs.jpg';
// Adjust the image path to be relative to the current file's location if it's not a full URL or already relative.
if (strpos($image_url, '../') !== 0 && strpos($image_url, '/') !== 0 && strpos($image_url, 'http') !== 0) {
    $image_url = '../' . $image_url;
}
// Sanitize the final image URL for HTML output.
$image_url = htmlspecialchars($image_url);

// Initialize an array to hold ingredients.
$ingredients_list = [];
// Loop through the 20 possible ingredient fields.
for ($i = 1; $i <= 20; $i++) {
    // Get and trim the ingredient name.
    $ing = trim($recipe['strIngredient' . $i] ?? '');
    // Get and trim the ingredient measure.
    $mes = trim($recipe['strMeasure' . $i] ?? '');
    // If the ingredient name is not empty, add it to the list.
    if (!empty($ing)) {
        $ingredients_list[] = ['amount' => $mes, 'item' => $ing];
    }
}

// Get the full instructions string.
$instructions_full = $recipe['strInstructions'] ?? '';
// Split instructions into an info header and the main directions.
$instructions_parts = explode("\n\n", $instructions_full, 2);
// If there are two parts, assign them accordingly.
if (count($instructions_parts) > 1) {
    $info_header = $instructions_parts[0];
    $directions_text = $instructions_parts[1];
} else {
    // Otherwise, there's no info header, only directions.
    $info_header = '';
    $directions_text = $instructions_parts[0];
}
// Split the directions text into an array of individual steps, normalizing line endings.
$directions = $directions_text ? explode("\n", str_replace(["\r\n", "\r"], "\n", $directions_text)) : [];
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?php echo $title; ?> | Recipe Book</title>

  <!-- Favicon links -->
  <link rel="apple-touch-icon" sizes="57x57" href="../images/favicon/apple-icon-57x57.png" />
  <link rel="apple-touch-icon" sizes="60x60" href="../images/favicon/apple-icon-60x60.png" />
  <link rel="apple-touch-icon" sizes="72x72" href="../images/favicon/apple-icon-72x72.png" />
  <link rel="apple-touch-icon" sizes="76x76" href="../images/favicon/apple-icon-76x76.png" />
  <link rel="apple-touch-icon" sizes="114x114" href="../images/favicon/apple-icon-114x114.png" />
  <link rel="apple-touch-icon" sizes="120x120" href="../images/favicon/apple-icon-120x120.png" />
  <link rel="apple-touch-icon" sizes="144x144" href="../images/favicon/apple-icon-144x144.png" />
  <link rel="apple-touch-icon" sizes="152x152" href="../images/favicon/apple-icon-152x152.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="../images/favicon/apple-icon-180x180.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="../images/favicon/android-icon-192x192.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="../images/favicon/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="../images/favicon/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="../images/favicon/favicon-96x96.png" />

  <!-- CSS stylesheets -->
  <link rel="stylesheet" type="text/css" href="../css/reset.css" />
  <link rel="stylesheet" type="text/css" href="../css/bootstrap.min.css" />
  <link rel="stylesheet" type="text/css" href="../css/font-awesome.min.css" />
  <link rel="stylesheet" type="text/css" href="../css/styles.css" />
  <!-- Modernizr for feature detection -->
  <script charset="utf-8" type="text/javascript" src="../js/modernizr.custom.js"></script>
</head>

<body>
  <!-- Header / Navigation bar -->
  <nav class="navbar navbar-default">
    <div class="container-fluid">
      <ul class="nav navbar-nav navbar-right">
        <li><a href="../index.php">Home</a></li>
        <?php if (isset($_SESSION['user_id'])): ?>
          <!-- Links for logged-in users -->
          <li><a href="my_recipes.php">My Recipes (<?php echo htmlspecialchars($_SESSION['username']); ?>)</a></li>
          <li><a href="logout.php">Logout</a></li>
        <?php else: ?>
          <!-- Links for guests -->
          <li><a href="login.php">Login</a></li>
          <li><a href="register.php">Register</a></li>
        <?php endif; ?>
      </ul>
    </div>
  </nav>
  <!-- Splash screen element -->
  <div id="splash"></div>

  <!-- Logo and search section -->
  <section id="logo">
    <div class="container text-center">
      <img src="../images/logo.png" alt="logo" />
      <br />
      <div style="max-width: 400px; margin: 20px auto 0;">
        <div style="display: flex; background: #fff; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <input type="text" placeholder="Search recipes..." style="flex-grow: 1; border: none; padding: 10px 15px; outline: none; font-size: 16px;">
          <button style="background: #fff; border: none; border-left: 1px solid #ddd; padding: 10px 15px; cursor: pointer; color: #333; outline: none;"><i class="fa fa-search"></i></button>
        </div>
      </div>
      <br />
    </div>
  </section>

  <!-- Main recipe content section -->
  <section id="recipe">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <!-- Display recipe title -->
           <br />
          <h2><?php echo $title; ?></h2>
          <br />
        </div>
      </div>
      <div class="row vertical-align">
        <div class="col-12">
          <div class="col-md-8 pull-left">
            <!-- Display recipe image -->
            <img src="<?php echo $image_url; ?>" alt="<?php echo $title; ?>" class="recipe-picture" />
          </div>
          <div class="col-md-4 pull-right">
            <div class="recipe-info">
              <h3>Info</h3>
              <?php if (isset($_SESSION['user_id'])): ?>
                <?php if ($is_owner): ?>
                  <!-- Delete recipe form for the owner -->
                  <form action="delete_recipe.php" method="POST" onsubmit="return confirm('Are you sure you want to delete this recipe? This action cannot be undone.');" style="margin-bottom: 15px;">
                      <input type="hidden" name="recipe_id" value="<?php echo htmlspecialchars($recipe['idMeal']); ?>">
                      <button type="submit" class="btn btn-danger btn-block">Delete Recipe</button>
                  </form>
                <?php else: ?>
                  <!-- Save/Unsave recipe form for logged-in users who are not the owner -->
                  <form action="save_recipe.php" method="POST" style="margin-bottom: 15px;">
                    <input type="hidden" name="recipe_id" value="<?php echo htmlspecialchars($recipe['idMeal']); ?>">
                    <?php if ($is_saved): ?>
                      <button type="submit" name="action" value="unsave" class="btn btn-danger btn-block">Unsave Recipe</button>
                    <?php else: ?>
                      <button type="submit" name="action" value="save" class="btn btn-success btn-block">Save Recipe</button>
                    <?php endif; ?>
                  </form>
                <?php endif; ?>
              <?php endif; ?>

              <!-- Display recipe metadata if available -->
              <?php if (!empty($recipe['strArea'])): ?>
                <div class="row"><div class="col-6">Area</div><div class="col-6"><?php echo htmlspecialchars($recipe['strArea']); ?></div></div>
              <?php endif; ?>
              <?php if (!empty($recipe['strCountry'])): ?>
                <div class="row"><div class="col-6">Country</div><div class="col-6"><?php echo htmlspecialchars($recipe['strCountry']); ?></div></div>
              <?php endif; ?>
              <?php if (!empty($recipe['strCategory'])): ?>
                <div class="row"><div class="col-6">Category</div><div class="col-6"><?php echo htmlspecialchars($recipe['strCategory']); ?></div></div>
              <?php endif; ?>
              <?php if (!empty($recipe['strTags'])): ?>
                <div class="row"><div class="col-6">Tags</div><div class="col-6"><?php echo htmlspecialchars($recipe['strTags']); ?></div></div>
              <?php endif; ?>
              <?php if (!empty($info_header)): ?>
                <!-- Display the info header from the instructions -->
                <div style="margin-top: 15px; white-space: pre-wrap;"><?php echo htmlspecialchars($info_header); ?></div>
              <?php endif; ?>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          <div class="recipe-ingredients">
            <h3>Ingredients</h3>
            <?php if (!empty($ingredients_list)): ?>
              <!-- Display list of ingredients -->
              <dl class="ingredients-list">
                <?php foreach ($ingredients_list as $ingredient):
                  // Sanitize amount and item for HTML output
                  $amount = htmlspecialchars($ingredient['amount']);
                  $item = htmlspecialchars($ingredient['item']);
                ?>
                  <dt><?php echo $amount; ?></dt>
                  <dd><?php echo $item; ?></dd>
                <?php endforeach; ?>
              </dl>
            <?php else: ?>
              <p>No ingredients provided.</p>
            <?php endif; ?>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          <div class="recipe-directions">
            <h3>Directions</h3>
            <?php if (!empty($directions)): ?>
              <!-- Display list of directions -->
              <ol>
                <?php foreach ($directions as $step):
                  // Trim whitespace from the step.
                  $step = trim($step);
                  // Skip empty lines.
                  if ($step === '') continue;
                  // If the line is just a step marker (e.g., "step 1"), skip it.
                  if (preg_match('/^step \d+$/i', $step)) continue;
                  // Remove step markers from the beginning of the line (e.g., "step 1 Heat the oven...")
                  $step = preg_replace('/^step \d+\s*/i', '', $step);
                  ?>
                  <li><?php echo htmlspecialchars($step); ?></li>
                <?php endforeach; ?>
              </ol>
            <?php else: ?>
              <p>No directions provided.</p>
            <?php endif; ?>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-12 text-center">
          <!-- Link to go back to the homepage -->
          <a href="../index.php">
            <i class="fa fa-backward" aria-hidden="true"></i>
            Go back to recipes.
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- JavaScript files -->
  <script charset="utf-8" src="../js/jquery-3.3.1.min.js"></script>
  <script charset="utf-8" src="../js/bootstrap.min.js"></script>
  <script charset="utf-8" src="../js/scripts.js"></script>
</body>

</html>
