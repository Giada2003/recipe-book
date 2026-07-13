<?php
// index.php
// Main landing page of the Recipe Book application
session_start();
require_once 'php/database.php';

$search_term = trim($_GET['search'] ?? '');
$db = get_db();
$all_meals = $db['meals'] ?? [];

// Sort all recipes by ID descending
usort($all_meals, fn($a, $b) => intval($b['idMeal']) <=> intval($a['idMeal']));

if (!empty($search_term)) {
    $recipes = array_filter($all_meals, function($meal) use ($search_term) {
        $title_match = stripos($meal['strMeal'], $search_term) !== false;
        $desc_match = isset($meal['strInstructions']) && stripos($meal['strInstructions'], $search_term) !== false;
        $category_match = isset($meal['strCategory']) && stripos($meal['strCategory'], $search_term) !== false;
        return $title_match || $desc_match || $category_match;
    });
} else {
    // Get the latest 9 recipes
    $recipes = array_slice($all_meals, 0, 9);
}

function rootImagePath($path) {
    if (empty($path)) {
        return 'images/bbq-pork-ribs.jpg';
    }
    if (strpos($path, '../') === 0) {
        return substr($path, 3);
    }
    return $path;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
  <!-- Basic meta info
  ==================== -->
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recipe Book</title>

  <!-- Favicon
  ============ -->
  <link rel="apple-touch-icon" sizes="57x57" href="images/favicon/apple-icon-57x57.png" />
  <link rel="apple-touch-icon" sizes="60x60" href="images/favicon/apple-icon-60x60.png" />
  <link rel="apple-touch-icon" sizes="72x72" href="images/favicon/apple-icon-72x72.png" />
  <link rel="apple-touch-icon" sizes="76x76" href="images/favicon/apple-icon-76x76.png" />
  <link rel="apple-touch-icon" sizes="114x114" href="images/favicon/apple-icon-114x114.png" />
  <link rel="apple-touch-icon" sizes="120x120" href="images/favicon/apple-icon-120x120.png" />
  <link rel="apple-touch-icon" sizes="144x144" href="images/favicon/apple-icon-144x144.png" />
  <link rel="apple-touch-icon" sizes="152x152" href="images/favicon/apple-icon-152x152.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="images/favicon/apple-icon-180x180.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="images/favicon/android-icon-192x192.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="images/favicon/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="images/favicon/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="images/favicon/favicon-96x96.png" />

  <!-- CSS files
  ============== -->
  <link rel="stylesheet" type="text/css" href="css/reset.css" />
  <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css" />
  <link rel="stylesheet" type="text/css" href="css/font-awesome.min.css"  />
  <link rel="stylesheet" type="text/css" href="css/styles.css" />

  <!-- Modernizr file
  =================== -->
  <script charset="utf-8" type="text/javascript "src="js/modernizr.custom.js"></script>

</head>

<body>

  <!-- Header / Navigation -->
  <nav class="navbar navbar-default" style="margin-bottom: 0;">
    <div class="container-fluid">
      <ul class="nav navbar-nav navbar-right">
        <li class="active"><a href="index.php">Home</a></li>
        <?php if (isset($_SESSION['user_id'])): ?>
          <li><a href="php/my_recipes.php">My Recipes (<?php echo htmlspecialchars($_SESSION['username']); ?>)</a></li>
          <li><a href="php/logout.php">Logout</a></li>
        <?php else: ?>
          <li><a href="php/login.php">Login</a></li>
          <li><a href="php/register.php">Register</a></li>
        <?php endif; ?>
      </ul>
    </div>
  </nav>

  <!-- Splash Screen
  ================== -->
  <div id="splash"></div>

  <!-- Website Logo
  ================= -->
  <section id="logo">
    <div class="container text-center">
      <img src="images/logo.png" alt="logo" />
      <form action="index.php" method="GET" style="max-width: 400px; margin: 20px auto 0;">
        <div style="display: flex; background: #fff; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <input type="text" name="search" placeholder="Search recipes..." value="<?php echo htmlspecialchars($search_term); ?>" style="flex-grow: 1; border: none; padding: 10px 15px; outline: none; font-size: 16px;">
          <button type="submit" style="background: #fff; border: none; border-left: 1px solid #ddd; padding: 10px 15px; cursor: pointer; color: #333; outline: none;"><i class="fa fa-search"></i></button>
        </div>
      </form>
      <br />
    </div>
  </section>

  <!-- Recipes Items
  ================== -->
  <section id="items">
    <div class="container">
      <div class="row">
        <?php if (count($recipes) > 0): ?>
          <?php foreach ($recipes as $recipe): ?>
            <div class="col-lg-4 col-md-6 col-sm-12">
              <div class="recipe-item text-center">
                <a href="php/recipe.php?id=<?php echo htmlspecialchars($recipe['idMeal']); ?>">
                  <img src="<?php echo htmlspecialchars(rootImagePath($recipe['strMealThumb'])); ?>" alt="<?php echo htmlspecialchars($recipe['strMeal']); ?>" />
                </a>
                <br />
                <h3><?php echo htmlspecialchars($recipe['strMeal']); ?></h3>
                <?php if (!empty($recipe['strCategory'])): ?>
                  <p class="text-muted"><?php echo htmlspecialchars(mb_strimwidth($recipe['strCategory'], 0, 80, '...')); ?></p>
                <?php endif; ?>
              </div>
            </div>
          <?php endforeach; ?>
        <?php else: ?>
          <div class="col-12 text-center">
            <p>No recipes available yet. Please check back later.</p>
          </div>
        <?php endif; ?>
      </div>
    </div>
  </section>

  <!-- JavaScript files
  ===================== -->
  <script charset="utf-8" src="js/jquery-3.3.1.min.js"></script>
  <script charset="utf-8" src="js/bootstrap.min.js"></script>
<script charset="utf-8" src="js/scripts.js"></script>
</body>

</html>
