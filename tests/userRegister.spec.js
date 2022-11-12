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

beforeAll(() => {
  return sequelize.sync({ force: true });
});

beforeEach(() => {
  return User.destroy({ truncate: true });
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
  ])(
    "return $expectedMessage when $field is $value when language is set to spanish",
    async (field, value, expectedMessage) => {
      const user = {
        username: "user1",
        email: "user1@mail.com",
        password: "P4ssword",
      };
      user[field] = value;

      const response = await postUser(user, { language: "es" });
      const body = response.body;

      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${EMAIL_IN_USE} when same email is already in use when language is set to spanish`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: "es" });

    expect(response.body.validationErrors.email).toBe(EMAIL_IN_USE);
  });

  it(`return ${USER_SUCCESS} message when signup request is valid with language is set as spanish`, async () => {
    const response = await postUser({ ...validUser }, { language: "es" });

    expect(response.body.message).toBe(USER_SUCCESS);
  });
});
