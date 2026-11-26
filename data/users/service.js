const config = require("../../config");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { use } = require("bcrypt/promises");

function UserService(UserModel) {
  let service = {
    create,
    createToken,
    createQrToken,
    verifyToken,
    verifyQrToken,
    findUser,
    findAll,
    findUserById,
    autorize,
    update,
  };

  function create(user) {
    return createPassword(user).then((hashPassword, err) => {
      if (err) {
        return Promise.reject("Not saved the user");
      }

      let newUserWithPassword = {
        ...user,
        password: hashPassword,
      };

      let newUser = UserModel(newUserWithPassword);
      return save(newUser);
    });
  }

  function createToken(user) {
    let token = jwt.sign(
      { id: user._id, name: user.name, role: user.role.scopes },
      config.secret,
      {
        expiresIn: config.expiresPassword,
      },
    );

    return { auth: true, token, role: user.role.scopes };
  }

  function createQrToken(userId) {
    return jwt.sign(
      { id: userId, purpose: "qr_login" },
      config.secret,
      { expiresIn: 60 },
    );
  }

  function verifyToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
          reject(err);
        }
        return resolve(decoded);
      });
    });
  }

  function verifyQrToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
          err.status = 401;
          return reject(err);
        }
        if (decoded.purpose !== "qr_login") {
          const error = new Error("Invalid QR login token");
          error.status = 401;
          return reject(error);
        }
        return resolve(decoded);
      });
    });
  }

  function save(model) {
    return new Promise(function (resolve, reject) {
      // do a thing, possibly async, then…
      model.save(function (err) {
        if (err) reject(err);

        resolve({
          message: "User saved",
          user: model,
        });
      });
    });
  }

  function update(id, user) {
    console.log("user", user);
    return new Promise(function (resolve, reject) {
      console.log("user", user);
      UserModel.findByIdAndUpdate(id, user, function (err, userUpdated) {
        if (err) reject("Dont updated User");
        resolve(userUpdated);
      });
    });
  }

  function findUserById(id) {
    return new Promise(function (resolve, reject) {
      UserModel.findById(id, function (err, user) {
        if (err) reject(err);

        resolve(user);
      });
    });
  }

  function findUser({ name, password, isQrCode }) {
    return new Promise(function (resolve, reject) {
      UserModel.findOne({ name }, function (err, user) {
        if (err) reject(err);
        //object of all users
        if (!user) {
          reject("This data is wrong");
        }
        resolve(user);
      });
    }).then((user) => {
      if (isQrCode) {
        return comparePassword(password, user.password).then((match) => {
          if (!match) return Promise.reject("User not valid");
          return Promise.resolve(user);
        });
      }
      return comparePassword(password, user.password).then((match) => {
        if (!match) return Promise.reject("User not valid");
        return Promise.resolve(user);
      });
    });
  }

  function findAll(pagination) {
    const { limit, skip } = pagination;

    return new Promise(function (resolve, reject) {
      UserModel.find({}, {}, { skip, limit }, function (err, users) {
        if (err) reject(err);

        resolve(users);
      });
    }).then(async (users) => {
      const totalPlayers = await UserModel.count();

      return Promise.resolve({
        data: users,
        pagination: {
          pageSize: limit,
          page: Math.floor(skip / limit),
          hasMore: skip + limit < totalPlayers,
          total: totalPlayers,
        },
      });
    });
  }

  //devolver a password encryptada
  function createPassword(user) {
    return bcrypt.hash(user.password, config.saltRounds);
  }

  //devolver se a password é ou não a mesma
  function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  function autorize(scopes) {
    return (request, response, next) => {
      const { roleUser } = request; //Este request só tem o roleUser porque o adicionamos no ficheiro players
      console.log(roleUser);
      console.log(scopes);
      const hasAutorization = scopes.some((scope) => roleUser.includes(scope));

      if (roleUser && hasAutorization) {
        next();
      } else {
        response.status(403).json({ message: "Forbidden" }); //acesso negado
      }
    };
  }

  return service;
}

module.exports = UserService;
