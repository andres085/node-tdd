const app = require("./src/app");
const addUsers = require("./src/utils/addUsers");

addUsers();

app.listen(3000, () => {
  console.log("Server is up!");
});
