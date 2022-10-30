const express = require("express");
const app = express();
app.use(express.json());

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const path = require("path");
const db_path = path.join(__dirname, "userData.db");

const bcrypt = require("bcrypt");

let db = null;

const initializeDbAndServer = async () => {
  db = await open({ filename: db_path, driver: sqlite3.Database });
  app.listen(3000, () => {
    try {
      console.log("server running at http://localhost:3000");
    } catch (error) {
      console.log(`DB ERROR ${error.message}`);
      process.exit(1);
    }
  });
};
initializeDbAndServer();

const checkUser = async (userName) => {
  try {
    const Query = `
        SELECT
            *
        FROM
            user
        WHERE
            username="${userName}";`;
    const response = await db.get(Query);
    if (response === undefined) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.log(`ERROR ${error.message}`);
  }
};

const checkPassword = async (password, username) => {
  const getUserPasswordQuery = `
        SELECT
            password
        FROM
            user
        WHERE
            username="${username}";`;
  const hashedPassword = await db.get(getUserPasswordQuery);
  const isPasswordMatch = await bcrypt.compare(
    password,
    hashedPassword.password
  );
  return isPasswordMatch;
};
//API 1 POST register
app.post("/register", async (request, response) => {
  try {
    const userDetails = request.body;
    const { username, name, password, gender, location } = userDetails;
    const userExist = await checkUser(username);
    if (userExist === true) {
      response.status(400);
      response.send("User already exists");
    } else {
      if (password.length >= 5) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const createUserQuery = `
            INSERT INTO
                user (username, name, password, gender, location)
            VALUES
                (
                    "${username}",
                    "${name}",
                    "${hashedPassword}",
                    "${gender}",
                    "${location}"
                );`;
        await db.run(createUserQuery);
        response.send("User created successfully");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    }
  } catch (error) {
    console.log(`ERROR ${error.message}`);
  }
});

// API 2 POST login
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const isUserExist = await checkUser(username);
  if (isUserExist === true) {
    const isPasswordMatch = await checkPassword(password, username);
    if (isPasswordMatch === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

//API 3 PUT change-password
app.put("/change-password", async (request, response) => {
  try {
    const { username, oldPassword, newPassword } = request.body;
    const isOldPasswordMatch = await checkPassword(oldPassword, username);
    if (isOldPasswordMatch === true) {
      if (newPassword.length >= 5) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                UPDATE
                    user
                SET
                    password="${hashedPassword}"
                WHERE
                    username="${username}";`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } catch (error) {
    console.log(`ERROR ${error.message}`);
  }
});

module.exports = app;
