<?php
// register.php
// User registration page
session_start();

// Redirect to dashboard if already logged in
if (isset($_SESSION['user_id'])) {
    header("Location: my_recipes.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Basic meta info -->
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Register - Recipe Book</title>

  <!-- CSS files -->
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
        <li><a href="login.php">Login</a></li>
        <li class="active"><a href="register.php">Register</a></li>
      </ul>
    </div>
  </nav>

  <!-- Registration Form Section -->
  <section id="auth-section" style="padding: 50px 0;">
    <div class="container">
      <div class="row">
        <div class="col-md-6 col-md-offset-3">
          <div class="panel panel-default">
            <div class="panel-heading">
              <h3 class="panel-title text-center">Register a New Account</h3>
            </div>
            <div class="panel-body">
              <!-- Placeholder for error/success messages -->
              <div id="auth-message"></div>
              
              <!-- The form uses data-action to tell auth.js what to do -->
              <form id="auth-form" data-action="register">
                <div class="form-group">
                  <label for="username">Username</label>
                  <input type="text" class="form-control" id="username" placeholder="Enter username" required>
                </div>
                <div class="form-group">
                  <label for="password">Password</label>
                  <input type="password" class="form-control" id="password" placeholder="Password" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Register</button>
              </form>
            </div>
            <div class="panel-footer text-center">
              Already have an account? <a href="login.php">Login here</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Javascript files -->
  <script charset="utf-8" src="../js/jquery-3.3.1.min.js"></script>
  <script charset="utf-8" src="../js/bootstrap.min.js"></script>
  <script charset="utf-8" src="../js/auth.js"></script>
</body>
</html>