<?php
session_start();
require_once 'database.php';

$recipe_id = $_GET['id'] ?? '';
if (empty($recipe_id)) {
    header('Location: ../index.php');
    exit;
}

$db = get_db();
$meals = array_filter($db['meals'] ?? [], fn($m) => $m['idMeal'] == $recipe_id);
$recipe = current($meals); // Get the first match

if (!$recipe) {
    // Recipe not found, redirect to home
    header('Location: ../index.php');
    exit;
}

// Check if user has saved this recipe
$is_saved = false;
$is_owner = false;
if (isset($_SESSION['user_id'])) {
    $current_user_id = $_SESSION['user_id'];
    if (isset($recipe['userId']) && $recipe['userId'] == $current_user_id) {
        $is_owner = true;
    }

    foreach ($db['users'] as $user) {
        if ($user['id'] == $current_user_id) {
            if (isset($user['savedMeals']) && in_array($recipe['idMeal'], $user['savedMeals'])) {
                $is_saved = true;
            }
            break;
        }
    }
}

// Sanitize and prepare recipe data for display
$title = htmlspecialchars($recipe['strMeal']);
$description = htmlspecialchars($recipe['strCategory']);
$image_url = $recipe['strMealThumb'] ?: 'images/bbq-pork-ribs.jpg';
if (strpos($image_url, '../') !== 0 && strpos($image_url, '/') !== 0 && strpos($image_url, 'http') !== 0) {
    $image_url = '../' . $image_url;
}
$image_url = htmlspecialchars($image_url);

$ingredients_list = [];
for ($i = 1; $i <= 20; $i++) {
    $ing = trim($recipe['strIngredient' . $i] ?? '');
    $mes = trim($recipe['strMeasure' . $i] ?? '');
    if (!empty($ing)) {
        $ingredients_list[] = ['amount' => $mes, 'item' => $ing];
    }
}

$instructions_full = $recipe['strInstructions'] ?? '';
$instructions_parts = explode("\n\n", $instructions_full, 2);
if (count($instructions_parts) > 1) {
    $info_header = $instructions_parts[0];
    $directions_text = $instructions_parts[1];
} else {
    $info_header = '';
    $directions_text = $instructions_parts[0];
}
$directions = $directions_text ? explode("\n", str_replace(["\r\n", "\r"], "\n", $directions_text)) : [];
?>
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?php echo $title; ?> | Recipe Book</title>

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

  <link rel="stylesheet" type="text/css" href="../css/reset.css" />
  <link rel="stylesheet" type="text/css" href="../css/bootstrap.min.css" />
  <link rel="stylesheet" type="text/css" href="../css/font-awesome.min.css" />
  <link rel="stylesheet" type="text/css" href="../css/animate.min.css" />
  <link rel="stylesheet" type="text/css" href="../css/styles.css" />
  <script charset="utf-8" type="text/javascript" src="../js/modernizr.custom.js"></script>
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
        <?php if (isset($_SESSION['user_id'])): ?>
          <li><a href="my_recipes.php">My Recipes (<?php echo htmlspecialchars($_SESSION['username']); ?>)</a></li>
          <li><a href="logout.php">Logout</a></li>
        <?php else: ?>
          <li><a href="login.php">Login</a></li>
          <li><a href="register.php">Register</a></li>
        <?php endif; ?>
      </ul>
    </div>
  </nav>
  <div id="splash"></div>

  <section id="logo">
    <div class="container text-center">
      <img src="../images/logo-white.svg" alt="logo" />
      <br />
      <h1>Recipe Book</h1>
      <div style="max-width: 400px; margin: 20px auto 0;">
        <div style="display: flex; background: #fff; border-radius: 4px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <input type="text" placeholder="Search recipes..." style="flex-grow: 1; border: none; padding: 10px 15px; outline: none; font-size: 16px;">
          <button style="background: #fff; border: none; border-left: 1px solid #ddd; padding: 10px 15px; cursor: pointer; color: #333; outline: none;"><i class="fa fa-search"></i></button>
        </div>
      </div>
    </div>
  </section>

  <section id="recipe">
    <div class="container">
      <div class="row">
        <div class="col-12">
          <h2><?php echo $title; ?></h2>
          <?php if ($description): ?>
            <p class="text-muted" style="margin-bottom: 20px;"><?php echo $description; ?></p>
          <?php endif; ?>
        </div>
      </div>
      <div class="row vertical-align">
        <div class="col-12">
          <div class="col-md-8 pull-left">
            <img src="<?php echo $image_url; ?>" alt="<?php echo $title; ?>" class="recipe-picture" />
          </div>
          <div class="col-md-4 pull-right">
            <div class="recipe-info">
              <h3>Info</h3>
              <?php if (isset($_SESSION['user_id']) && !$is_owner): ?>
                <form action="save_recipe.php" method="POST" style="margin-bottom: 15px;">
                  <input type="hidden" name="recipe_id" value="<?php echo htmlspecialchars($recipe['idMeal']); ?>">
                  <?php if ($is_saved): ?>
                    <button type="submit" name="action" value="unsave" class="btn btn-danger btn-block">Unsave Recipe</button>
                  <?php else: ?>
                    <button type="submit" name="action" value="save" class="btn btn-success btn-block">Save Recipe</button>
                  <?php endif; ?>
                </form>
              <?php endif; ?>

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
              <dl class="ingredients-list">
                <?php foreach ($ingredients_list as $ingredient):
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
              <ol>
                <?php foreach ($directions as $step):
                  $step = trim($step);
                  if ($step === '') continue;
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
          <a href="../index.php">
            <i class="fa fa-backward" aria-hidden="true"></i>
            Go back to recipes.
          </a>
        </div>
      </div>
    </div>
  </section>

  <script charset="utf-8" src="../js/jquery-3.3.1.min.js"></script>
  <script charset="utf-8" src="../js/bootstrap.min.js"></script>
  <script charset="utf-8" src="../js/scripts.js"></script>
</body>

</html>
