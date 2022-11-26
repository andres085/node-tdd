const nodemailer = require("nodemailer");
const transporter = require("../config/emailTransporter");

const sendActivationEmail = async (email, token) => {
  const info = await transporter.sendMail({
    from: "My App <info@my-app.com",
    to: email,
    subject: "Account Activation",
    html: `<div><h1>Please click the link below to activate your account</h1><div>
    <a href="http://localhost:8080/#/login?token=${token}">Activate</a>
    </div>
    </div>`,
  });
  if (process.env.NODE_ENV === "development") {
    console.log("url: " + nodemailer.getTestMessageUrl(info));
  }
};

module.exports = { sendActivationEmail };
