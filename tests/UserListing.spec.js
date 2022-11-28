const request = require("supertest");
const app = require("../src/app");
const sequelize = require("../src/config/database");
const User = require("../src/models/User");
jest.setTimeout(30000);

beforeAll(async () => {
  return sequelize.sync({ force: true });
});

beforeEach(async () => {
  return User.destroy({ truncate: true });
});

const getUsers = () => {
  return request(app).get("/api/1.0/users");
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
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
});
