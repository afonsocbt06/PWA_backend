const bodyParser = require("body-parser");
const express = require("express");
const Users = require("../data/users");
const cookieParser = require('cookie-parser');
const VerifyToken = require('../middleware/token');

function AuthRouter() {
  let router = express();

  router.use(bodyParser.json({ limit: "100mb" }));
  router.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

  router.route("/register").post(function (req, res, next) {
    const body = req.body;

    const { role } = body;

    if(!role.scopes.includes('admin')) {
      return res.status(401).send({ auth: false, message: 'Only create Admin' })
    }

    Users.create(body)
      .then(() => Users.createToken(body))
      .then((response) => {
        res.status(200);
        res.send(response);
      })
      .catch((err) => {
        res.status(500);
        res.send(err);
        next();
      });
  });

  router.route("/login").post(function (req, res, next) {
    let body = req.body;
    const expectedRole = body.expectedRole;

    return Users.findUser(body)
      .then((user) => {
        const isAdmin = user.role.scopes.includes("admin");
        const roleMatches =
          !expectedRole ||
          (expectedRole === "admin" ? isAdmin : !isAdmin);

        if (!roleMatches) {
          return Promise.reject("Use the correct login form for this account");
        }

        return user;
      })
      .then((user) => {
        return Users.createToken(user);
      })
      .then((response) => {
        console.log('response', response)
        const isProduction = process.env.NODE_ENV === "production";
        // The httpOnly: true setting means that the cookie can’t be read using JavaScript but can still be sent back to the server in HTTP requests
        res.cookie("token", response.token, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
        });
        res.status(200);
        res.send(response);
      })
      .catch((err) => {
        console.log('error', err);
        res.status(500).json({ auth: false, message: err });
      });
  });

  router.use(cookieParser()); // Adicionar esta verificação
  router.use(VerifyToken); // Adicionar esta verificação

  router.route("/logout").get(function (req, res, next) {
    // The httpOnly: true setting means that the cookie can’t be read using JavaScript but can still be sent back to the server in HTTP requests
    // MaxAge : It allows us to invalidate the cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    res.status(200);
    res.send({ logout: true });
    next();
  });

  router.route("/me").get(function(req, res, next)  {
    res.status(200).send({
      auth: true,
      role: req.roleUser,
      decoded: {
        id: req.id,
        role: req.roleUser,
      },
    });
  });

  return router;
}

module.exports = AuthRouter;
