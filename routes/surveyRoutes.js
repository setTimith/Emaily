const mongoose = require("mongoose");
const requireLogin = require("../middlewares/requireLogin");
const requireCredits = require("../middlewares/requireCredits");
const Mailer = require("../services/Mailer");
const surveyTemplates = require("../services/emailTemplates/surveyTemplates");

const Survey = mongoose.model("surveys");

module.exports = (app) => {
  app.get("/api/surveys/thanks", (req, res) => {
    res.send("Thanks for voting");
  });

  app.get("/api/surveys", requireLogin, async (req, res) => {
    const surveys = await Survey.find({
      _user: req.user.id,
    }).select({ recipients: false });

    res.send(surveys);
  });

  app.post("/api/surveys", requireLogin, requireCredits, async (req, res) => {
    if (req.credits) {
      const { title, subject, body, recipients } = req.body;

      const survey = new Survey({
        title,
        subject,
        body,
        recipients: recipients.split(",").map((email) => ({
          email: email.trim(),
        })),
        _user: req.user.id,
        dateSent: Date.now(),
      });
      const mailer = new Mailer(survey, surveyTemplates(survey));

      try {
        await mailer.send();
        await survey.save();
        req.user.credits -= 1;
        const user = await req.user.save();

        res.send(user);
      } catch (err) {
        res.status(422).send(err);
      }
    }
  });
};
