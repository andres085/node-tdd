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

const updateUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await agent.post("/api/1.0/auth").send(options.auth);
    token = response.body.token;
  }
  agent = request(app).put(`/api/1.0/users/${id}`);
  if (options.language) {
    agent.set("Accept-Language", options.language);
  }
  if (token) {
    agent.set("Authorization", `Bearer ${token}`);
  }
  return agent.send(body);
};

const activeUser = { username: "user1", email: "user1@mail.com", password: "P4ssword", inactive: false };

const addUser = async (user = { ...activeUser }) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;

  return await User.create(user);
};

describe("User Update", () => {
  it("returns forbidden when request sent without basic authorization", async () => {
    const response = await updateUser();
    expect(response.status).toBe(403);
  });

  it.each([
    [en.UNAUTHORIZED_USER_UPDATE, "en"],
    [es.UNAUTHORIZED_USER_UPDATE, "es"],
  ])(
    "returns error body with %s message for unauthorized user when language is set to %s",
    async (message, language) => {
      const nowInMilliseconds = new Date().getTime();
      const response = await updateUser(5, null, { language });

      expect(response.body.path).toBe("/api/1.0/users/5");
      expect(response.body.timestamp).toBeGreaterThan(nowInMilliseconds);
      expect(response.body.message).toBe(message);
    }
  );

  it("returns forbidden when request send with an incorrect email in basic authorization", async () => {
    await addUser();
    const response = await updateUser(5, null, { auth: { email: "user1000@mail.com", password: "P4ssword" } });

    expect(response.status).toBe(403);
  });

  it("returns forbidden when request send with an incorrect password in basic authorization", async () => {
    await addUser();
    const response = await updateUser(5, null, { auth: { email: "user1@mail.com", password: "P4sword" } });

    expect(response.status).toBe(403);
  });

  it("returns forbidden when update request is sent with correct credentials but for different user", async () => {
    await addUser();
    const userToBeUpdated = await addUser({ ...activeUser, username: "user2", email: "user2@mail.com" });

    const response = await updateUser(userToBeUpdated.id, null, {
      auth: { email: "user1@mail.com", password: "P4ssword" },
    });

    expect(response.status).toBe(403);
  });

  it("returns forbidden when update request is sent by inactive user with correct credentials", async () => {
    const inactiveUser = await addUser({ ...activeUser, inactive: true });

    const response = await updateUser(inactiveUser.id, null, {
      auth: { email: "user1@mail.com", password: "P4ssword" },
    });

    expect(response.status).toBe(403);
  });

  it("returns 200 ok when valid update request is sent from authorized user", async () => {
    const savedUser = await addUser();
    const validUpdate = { username: "user1-updated" };
    const response = await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: "P4ssword" },
    });

    expect(response.status).toBe(200);
  });

  it("update user in database when valid update request is sent from authorized user", async () => {
    const savedUser = await addUser();
    const validUpdate = { username: "user1-updated" };
    await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: "P4ssword" },
    });

    const updatedUser = await User.findOne({ where: { id: savedUser.id } });
    expect(updatedUser.username).toBe(validUpdate.username);
  });
});
