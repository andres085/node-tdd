const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const sequelize = require("../src/config/database");
const {
  USERNAME_NULL,
  USERNAME_SIZE,
  EMAIL_NULL,
  EMAIL_INVALID,
  PASSWORD_NULL,
  PASSWORD_SIZE,
  PASSWORD_PATTERN,
  EMAIL_IN_USE,
} = require("../src/utils/constants");
const SMTPServer = require("smtp-server").SMTPServer;

let lastMail;
let server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, _, callback) {
      let mailBody;
      stream.on("data", (data) => {
        mailBody += data.toString();
      });
      stream.on("end", () => {
        if (simulateSmtpFailure) {
          const err = new Error("Invalid Mailbox");
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });
  await server.listen(8587, "localhost");

  return sequelize.sync({ force: true });
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  return User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

const validUser = {
  username: "user1",
  email: "user1@mail.com",
  password: "P4ssword",
};

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post("/api/1.0/users");
  if (options.language) {
    agent.set("Accept-Language", options.language);
  }
  return agent.send(user);
};

describe("User Registration", () => {
  it("return 200 OK when signup request is valid", async () => {
    const response = await postUser();

    expect(response.status).toBe(200);
  });

  it("return success message when signup request is valid", async () => {
    const response = await postUser();

    expect(response.body.message).toBe("User created");
  });

  it("saves the user to database", async () => {
    await postUser();

    const users = await User.findAll();
    expect(users.length).toBe(1);
  });

  it("saves the username and email to database", async () => {
    await postUser();

    const users = await User.findAll();
    const savedUser = users[0];

    expect(savedUser.username).toBe("user1");
    expect(savedUser.password).not.toBe("P4ssword");
  });

  it("hashes the password in database", async () => {
    await postUser();

    const users = await User.findAll();
    const savedUser = users[0];

    expect(savedUser.password).not.toBe("P4ssword");
  });

  it("returns 400 when username is null", async () => {
    const response = await postUser({
      username: null,
      email: "user1@mail.com",
      password: "P4ssword",
    });

    expect(response.status).toBe(400);
  });

  it("returns validationErrors field in response body when validation error occurs", async () => {
    const response = await postUser({
      username: null,
      email: "user1@mail.com",
      password: "P4ssword",
    });

    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it("returns errors for both when username and email is null", async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: "P4ssword",
    });

    const body = response.body;

    expect(Object.keys(body.validationErrors)).toEqual(["username", "email"]);
  });

  it.each([
    ["username", null, USERNAME_NULL],
    ["username", "usr", USERNAME_SIZE],
    ["username", "a".repeat(33), USERNAME_SIZE],
    ["email", null, EMAIL_NULL],
    ["email", "mail.com", EMAIL_INVALID],
    ["email", "user.mail.com", EMAIL_INVALID],
    ["email", "user@mail", EMAIL_INVALID],
    ["password", null, PASSWORD_NULL],
    ["password", "P4ssw", PASSWORD_SIZE],
    ["password", "alllowercase", PASSWORD_PATTERN],
    ["password", "ALLUPPERCASE", PASSWORD_PATTERN],
    ["password", "123456", PASSWORD_PATTERN],
    ["password", "lowerANDUPPER", PASSWORD_PATTERN],
    ["password", "lowern4nd5667", PASSWORD_PATTERN],
    ["password", "UPPER45556", PASSWORD_PATTERN],
  ])("when %s is null %s is received", async (field, value, expectedMessage) => {
    const user = {
      username: "user1",
      email: "user1@mail.com",
      password: "P4ssword",
    };
    user[field] = value;

    const response = await postUser(user);
    const body = response.body;

    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it("return E-mail in use when same email is already in use", async () => {
    await User.create({ ...validUser });

    const response = await postUser();

    expect(response.body.validationErrors.email).toBe(EMAIL_IN_USE);
  });

  it("return errors for both username is null and email is in use", async () => {
    await User.create({ ...validUser });

    const response = await postUser({
      username: null,
      email: validUser.email,
      password: "P4ssword2",
    });
    const body = response.body;

    expect(Object.keys(body.validationErrors)).toEqual(["username", "email"]);
  });

  it("creates user in inactive mode", async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];

    expect(savedUser.inactive).toBe(true);
  });

  it("creates user in inactive mode even when the request is false", async () => {
    const newUser = {
      ...validUser,
      inactive: false,
    };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];

    expect(savedUser.inactive).toBe(true);
  });

  it("creates an activationToken for user", async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];

    expect(savedUser.activationToken).toBeTruthy();
  });

  it("send an account activation email with activationToken", async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];

    expect(lastMail).toContain("user1@mail.com");
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it("returns 502 Bad Gateway when sending email fails", async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it("returns Email failure message when sending email fails", async () => {
    simulateSmtpFailure = true;

    const response = await postUser();
    expect(response.body.message).toBe("E-mail Failure");
  });

  it("does not save user to database if activation email fails", async () => {
    simulateSmtpFailure = true;

    await postUser();
    const users = await User.findAll();

    expect(users.length).toBe(0);
  });

  it("returns Validation Failure message in error response body when validation fails", async () => {
    const response = await postUser({
      username: null,
      email: "user1@mail.com",
      password: "P4ssword",
    });

    expect(response.body.message).toBe("Validation Failure");
  });
});

describe("Internationalization", () => {
  const USERNAME_NULL = "El nombre de usuario requerido";
  const USERNAME_SIZE = "El nombre de usuario debe tener min 4 y max 32 caracteres";
  const EMAIL_NULL = "El E-mail es requerido";
  const EMAIL_INVALID = "El E-mail debe ser valido";
  const PASSWORD_NULL = "La contraseña es requerida";
  const PASSWORD_SIZE = "La contraseña debe tener al menos 6 caracteres";
  const PASSWORD_PATTERN =
    "La contraseña debe tener al menos 1 letra en mayuscula, 1 una letra en minuscula y 1 numero";
  const EMAIL_IN_USE = "El E-mail esta en uso";
  const USER_SUCCESS = "Usuario creado con exito";
  const EMAIL_FAILURE = "El E-mail es incorrecto";
  const VALIDATION_FAILURE = "Error de validación";

  it.each([
    ["username", null, USERNAME_NULL],
    ["username", "usr", USERNAME_SIZE],
    ["username", "a".repeat(33), USERNAME_SIZE],
    ["email", null, EMAIL_NULL],
    ["email", "mail.com", EMAIL_INVALID],
    ["email", "user.mail.com", EMAIL_INVALID],
    ["email", "user@mail", EMAIL_INVALID],
    ["password", null, PASSWORD_NULL],
    ["password", "P4ssw", PASSWORD_SIZE],
    ["password", "alllowercase", PASSWORD_PATTERN],
    ["password", "ALLUPPERCASE", PASSWORD_PATTERN],
    ["password", "123456", PASSWORD_PATTERN],
    ["password", "lowerANDUPPER", PASSWORD_PATTERN],
    ["password", "lowern4nd5667", PASSWORD_PATTERN],
    ["password", "UPPER45556", PASSWORD_PATTERN],
  ])("if %s field is %s return %s message when language is set to spanish", async (field, value, expectedMessage) => {
    const user = {
      username: "user1",
      email: "user1@mail.com",
      password: "P4ssword",
    };
    user[field] = value;

    const response = await postUser(user, { language: "es" });
    const body = response.body;

    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it(`returns ${EMAIL_IN_USE} when same email is already in use when language is set to spanish`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: "es" });

    expect(response.body.validationErrors.email).toBe(EMAIL_IN_USE);
  });

  it(`return ${USER_SUCCESS} message when signup request is valid with language is set as spanish`, async () => {
    const response = await postUser({ ...validUser }, { language: "es" });

    expect(response.body.message).toBe(USER_SUCCESS);
  });

  it(`returns ${EMAIL_FAILURE} message in spanish when sending email fails`, async () => {
    simulateSmtpFailure = true;

    const response = await postUser({ ...validUser }, { language: "es" });
    expect(response.body.message).toBe(EMAIL_FAILURE);
  });

  it(`returns ${VALIDATION_FAILURE} message translated to spanish in error response body when validation fails`, async () => {
    const response = await postUser(
      {
        username: null,
        email: "user1@mail.com",
        password: "P4ssword",
      },
      { language: "es" }
    );

    expect(response.body.message).toBe(VALIDATION_FAILURE);
  });
});

describe("Account activation", () => {
  it("activates the account when correct token is sent", async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    users = await User.findAll();

    expect(users[0].inactive).toBe(false);
  });

  it("removes the token from user table after successful activation", async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    users = await User.findAll();

    expect(users[0].activationToken).toBeFalsy();
  });

  it("does not activate the account when token is invalid", async () => {
    await postUser();
    let users = await User.findAll();
    const token = "invalid-token";

    await request(app).post(`/api/1.0/users/token/${token}`).send();
    users = await User.findAll();

    expect(users[0].inactive).toBe(true);
  });

  it("returns bad request when token is wrong", async () => {
    await postUser();
    const token = "invalid-token";

    const response = await request(app).post(`/api/1.0/users/token/${token}`).send();

    expect(response.status).toBe(400);
  });

  it.each([
    ["en", "invalid-token", "This account is either active or the token is invalid"],
    ["es", "invalid-token", "Esta cuenta esta activada o el token es invalido"],
    ["en", "correct-token", "The account was activated succesfully"],
    ["es", "correct-token", "La cuenta fue activada con exito"],
  ])(`when language is %s and token with value %s is sent shows %s message`, async (language, token, message) => {
    await postUser();

    if (token === "correct-token") {
      const users = await User.findAll();
      token = users[0].activationToken;
    }

    const response = await request(app).post(`/api/1.0/users/token/${token}`).set("Accept-Language", language).send();

    expect(response.body.message).toBe(message);
  });
});

describe("Error Model", () => {
  it("returns path, timestamp, message and validationErrors in response when validation failure", async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;

    expect(Object.keys(body)).toEqual(["path", "timestamp", "message", "validationErrors"]);
  });

  it("returns path, timestamp and message in response when request fails other than validation error", async () => {
    await postUser();
    const token = "invalid-token";

    const response = await request(app).post(`/api/1.0/users/token/${token}`).send();
    const body = response.body;

    expect(Object.keys(body)).toEqual(["path", "timestamp", "message"]);
  });

  it("returns path in error body", async () => {
    await postUser();
    const token = "invalid-token";

    const path = `/api/1.0/users/token/${token}`;
    const response = await request(app).post(`/api/1.0/users/token/${token}`).send();
    const body = response.body;

    expect(body.path).toEqual(path);
  });

  it("returns timestamp in miliseconds within 5 seconds value in error body", async () => {
    await postUser();
    const token = "invalid-token";

    const nowInMiliSeconds = new Date().getTime();
    const fiveSecondsLater = nowInMiliSeconds + 5 * 1000;
    const response = await request(app).post(`/api/1.0/users/token/${token}`).send();
    const body = response.body;

    expect(body.timestamp).toBeGreaterThan(nowInMiliSeconds);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
