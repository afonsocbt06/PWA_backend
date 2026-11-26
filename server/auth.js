const bodyParser = require("body-parser");
const express = require("express");
const Users = require("../data/users");
const cookieParser = require('cookie-parser');
const VerifyToken = require('../middleware/token');

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
}

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
        setAuthCookie(res, response.token);
        res.status(200);
        res.send(response);
      })
      .catch((err) => {
        console.log('error', err);
        res.status(500).json({ auth: false, message: err });
      });
  });

  router.route("/qr-login").post(function (req, res) {
    const { qrToken, expectedRole } = req.body;

    if (typeof qrToken !== "string" || !qrToken) {
      return res.status(400).json({ auth: false, message: "QR token is required" });
    }

    Users.verifyQrToken(qrToken)
      .then(({ id }) => Users.findUserById(id))
      .then((user) => {
        if (!user) {
          const error = new Error("QR code user not found");
          error.status = 401;
          throw error;
        }

        const isAdmin = user.role.scopes.includes("admin");
        const roleMatches =
          !expectedRole ||
          (expectedRole === "admin" ? isAdmin : !isAdmin);

        if (!roleMatches) {
          const error = new Error("Use the correct login form for this account");
          error.status = 403;
          throw error;
        }

        return Users.createToken(user);
      })
      .then((response) => {
        setAuthCookie(res, response.token);
        res.status(200).json(response);
      })
      .catch((err) => {
        console.error("QR login failed", err);
        const status = err.status || 500;
        const message =
          status === 401
            ? "Invalid or expired QR code"
            : status === 403
              ? "Use the correct login form for this account"
              : "Unable to complete QR login";
        res.status(status).json({ auth: false, message });
      });
  });

  router.use(cookieParser()); // Adicionar esta verificação
  router.use(VerifyToken); // Adicionar esta verificação

  router.route("/qr-token").post(function (req, res) {
    res.set("Cache-Control", "no-store");
    res.status(200).json({ qrToken: Users.createQrToken(req.id) });
  });

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
