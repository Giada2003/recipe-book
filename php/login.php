<?php
// login.php
// User login page
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
  <title>Login - Recipe Book</title>

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
      <ul class="nav navbar-nav navbar-right">
        <li><a href="../index.php">Home</a></li>
        <li class="active"><a href="login.php">Login</a></li>
        <li><a href="register.php">Register</a></li>
      </ul>
    </div>
  </nav>

  <!-- Login Form Section -->
  <section id="auth-section" style="padding: 50px 0;">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="panel panel-default">
            <div class="panel-heading">
              <h3 class="panel-title text-center">Login to Your Account</h3>
            </div>
            <div class="panel-body">
              <!-- Placeholder for error/success messages -->
              <div id="auth-message"></div>

              <!-- The form uses data-action to tell auth.js what to do -->
              <form id="auth-form" data-action="login">
                <div class="form-group">
                  <label for="username">Username</label>
                  <input type="text" class="form-control" id="username" placeholder="Enter username" required>
                </div>
                <div class="form-group">
                  <label for="password">Password</label>
                  <input type="password" class="form-control" id="password" placeholder="Password" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Login</button>
              </form>
            </div>
            <div class="panel-footer text-center">
              Don't have an account? <a href="register.php">Register here</a>
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
