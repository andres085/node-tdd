const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const sequelize = require("../src/config/database");
const bcrypt = require("bcrypt");
const en = require("../locales/en/translation.json");
const es = require("../locales/es/translation.json");

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const activeUser = { username: "user1", email: "user1@mail.com", password: "P4ssword", inactive: false };

const addUser = async (user = { ...activeUser }) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;

  return await User.create(user);
};

const postAuthentication = async (credentials, options = {}) => {
  let agent = request(app).post("/api/1.0/auth");
  if (options.language) {
    agent.set("Accept-Language", options.language);
  }
  return await agent.send(credentials);
};

describe("Authentication", () => {
  it("returns 200 when credentials are correct", async () => {
    await addUser();
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" });

    expect(response.status).toBe(200);
  });

  it("returns only user id, username and token when loggin success", async () => {
    const user = await addUser();
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" });

    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(["id", "username", "token"]);
  });

  it("returns 401 when user does not exist", async () => {
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" });

    expect(response.status).toBe(401);
  });

  it("returns proper error body when authentication fails", async () => {
    const nowInMilliSeconds = new Date().getTime();
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" });
    const error = response.body;

    expect(error.path).toBe("/api/1.0/auth");
    expect(error.timestamp).toBeGreaterThan(nowInMilliSeconds);
    expect(Object.keys(error)).toEqual(["path", "timestamp", "message"]);
  });

  it.each([
    [en.AUTHENTICATION_FAILURE, "en"],
    [es.AUTHENTICATION_FAILURE, "es"],
  ])("returns %s when authentication fails and language is %s", async (message, language) => {
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" }, { language });

    expect(response.body.message).toBe(message);
  });

  it("returns 401 when password is wrong", async () => {
    await addUser();
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4sword" });

    expect(response.status).toBe(401);
  });

  it("returns 403 when loggin in with an inactive account", async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" });

    expect(response.status).toBe(403);
  });

  it("returns proper error body when inactive authentication fails", async () => {
    const nowInMilliSeconds = new Date().getTime();
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" });
    const error = response.body;

    expect(error.path).toBe("/api/1.0/auth");
    expect(error.timestamp).toBeGreaterThan(nowInMilliSeconds);
    expect(Object.keys(error)).toEqual(["path", "timestamp", "message"]);
  });

  it.each([
    [en.INACTIVE_ACCOUNT, "en"],
    [es.INACTIVE_ACCOUNT, "es"],
  ])("returns %s when authentication fails and language is %s", async (message, language) => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" }, { language });

    expect(response.body.message).toBe(message);
  });

  it("returns 401 when e-mail is not valid", async () => {
    const response = await postAuthentication({ password: "P4ssword" });

    expect(response.status).toBe(401);
  });

  it("returns 401 when password is not valid", async () => {
    const response = await postAuthentication({ email: "user1@mail.com" });

    expect(response.status).toBe(401);
  });

  it("returns token in response body when credentials are correct", async () => {
    await addUser();

    const response = await postAuthentication({ email: "user1@mail.com", password: "P4ssword" });

    expect(response.body.token).not.toBeUndefined();
  });
});
