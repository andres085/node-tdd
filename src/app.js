const express = require("express");
const app = express();
const userRouter = require("./routes/user.router");
const i18next = require("i18next");
const Backend = require("i18next-fs-backend");
const middleware = require("i18next-http-middleware");

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: "en",
    lng: "en",
    ns: ["translation"],
    defaultNS: "translation",
    backend: {
      loadPath: "./locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      lookupHeader: "accept-language",
    },
  });

app.use(middleware.handle(i18next));
app.use(express.json());

app.use("/api/1.0/users", userRouter);

module.exports = app;
