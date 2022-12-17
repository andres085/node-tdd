const request = require("supertest");
const app = require("../src/app");
const sequelize = require("../src/config/database");
const User = require("../src/models/User");
const en = require("../locales/en/translation.json");
const es = require("../locales/es/translation.json");
const bcrypt = require("bcrypt");

beforeAll(async () => {
  return await sequelize.sync({ force: true });
});

beforeEach(async () => {
  return await User.destroy({ truncate: true });
});

const getUsers = (options = {}) => {
  const agent = request(app).get("/api/1.0/users");
  if (options.auth) {
    const { email, password } = options.auth;
    agent.auth(email, password);
  }
  return agent;
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hashedPassword = await bcrypt.hash("P4ssword", 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
      password: hashedPassword,
    });
  }
};

describe("Listing Users", () => {
  it("returns 200 ok when there are np user in database", async () => {
    const response = await getUsers();

    expect(response.status).toBe(200);
  });

  it("returns page object as response body", async () => {
    const response = await getUsers();

    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it("returns 10 users in page content when there are 11 users in database", async () => {
    await addUsers(11);

    const response = await getUsers();
    const content = response.body.content;

    expect(content.length).toEqual(10);
  });

  it("returns 6 users in page content when there are active 6 users and inactive 5 users in database", async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    const content = response.body.content;

    expect(content.length).toEqual(6);
  });

  it("returns only id, username and email in content array for each user", async () => {
    await addUsers(11);
    const response = await getUsers();
    const user = response.body.content[0];

    expect(Object.keys(user)).toEqual(["id", "username", "email"]);
  });

  it("returns 2 as totalPages when there are 15 active and 7 inactive users", async () => {
    await addUsers(15, 7);

    const response = await getUsers();
    const totalPages = response.body.totalPages;

    expect(totalPages).toBe(2);
  });

  it("returns second page users and page indicator when page is set as 1 in request parameter", async () => {
    await addUsers(11);

    const response = await getUsers().query({ page: 1 });

    const body = response.body;

    expect(body.content[0].username).toBe("user11");
    expect(body.page).toBe(1);
  });

  it("returns first page when page is set below zero as request parameter", async () => {
    await addUsers(11);

    const response = await getUsers().query({ page: -5 });

    const body = response.body;

    expect(body.page).toBe(0);
  });

  it("returns 5 users and corresponding size indicator when size is set as 5 in request parameter", async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 5 });
    const body = response.body;

    expect(body.content.length).toBe(5);
    expect(body.size).toBe(5);
  });

  it("returns 10 users and corresponding size indicator when size is set as 1000", async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 1000 });
    const body = response.body;

    expect(body.content.length).toBe(10);
    expect(body.size).toBe(10);
  });

  it("returns 10 users and corresponding size indicator when size is set as 0", async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 0 });
    const body = response.body;

    expect(body.content.length).toBe(10);
    expect(body.size).toBe(10);
  });

  it("returns page as zero and size as 10 when non numeric query params provided for both values", async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: "size", page: "page" });
    const body = response.body;

    expect(body.size).toBe(10);
    expect(body.page).toBe(0);
  });

  it("returns users page without logged in user when request has valid authorization", async () => {
    await addUsers(11);

    const response = await getUsers({ auth: { email: "user1@mail.com", password: "P4ssword" } });
    const body = response.body;

    expect(body.totalPages).toBe(1);
  });
});

describe("Get User", () => {
  const getUser = (id = 5) => {
    return request(app).get(`/api/1.0/users/${id}`);
  };

  it("returns 404 when user not found", async () => {
    const response = await getUser();

    expect(response.status).toBe(404);
  });

  it.each([
    [es.USER_NOT_FOUND, "es"],
    [en.USER_NOT_FOUND, "en"],
  ])("returns %s for unknown user when language is set to %s", async (message, language) => {
    const response = await getUser().set("Accept-Language", language);

    expect(response.body.message).toBe(message);
  });

  it("returns proper error body when user not found", async () => {
    const nowInMilliSeconds = new Date().getTime();
    const response = await getUser();
    const error = response.body;

    expect(error.path).toBe("/api/1.0/users/5");
    expect(error.timestamp).toBeGreaterThan(nowInMilliSeconds);
    expect(Object.keys(error)).toEqual(["path", "timestamp", "message"]);
  });

  it("returns 200 when an active user exists", async () => {
    const user = await User.create({
      username: "user1",
      email: "user1@mail.com",
      inactive: false,
    });

    const response = await getUser(user.dataValues.id);

    expect(response.status).toBe(200);
  });

  it("returns id, username and email when an active user exists", async () => {
    const user = await User.create({
      username: "user1",
      email: "user1@mail.com",
      inactive: false,
    });

    const response = await getUser(user.id);
    const body = response.body;

    expect(Object.keys(body)).toEqual(["id", "username", "email"]);
  });

  it("returns 404 when the user is inactive", async () => {
    const user = await User.create({
      username: "user1",
      email: "user1@mail.com",
      inactive: true,
    });

    const response = await getUser(user.id);

    expect(response.status).toBe(404);
  });
});
