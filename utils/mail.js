const nodemailer = require("nodemailer");
const mailTemplates = require("./mail.templates");

// send no replay
// sund support

module.exports.send = async function (email, verificationLink) {

  const account = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  };

  let transporter = nodemailer.createTransport({
    // host: "smtp.gmail.com",
    // port: 465,
    // secure: false, // true for 465, false for other ports
    service: 'gmail',
    auth: {
      user: account.user, // generated ethereal user
      pass: account.pass, // generated ethereal password
    },
    // tls: {
    //   rejectUnauthorized: false
    // }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Le Gite Du Nucleaire" <' + account.user + '>',
    to: email, // list of receivers
    subject: "Account verification", // Subject line
    html: mailTemplates.getEmailVerificationTemplate({
      verificationLink: verificationLink,
    }), // html body
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
};



module.exports.sendResetCodeEmail = async (email, text) => {
  
    const account = {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    };
  
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: account.user, // generated ethereal user
        pass: account.pass, // generated ethereal password
      },
      // tls: {
      //   rejectUnauthorized: false
      // }
    });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Le Gite Du Nucleaire" <' + account.user + '>',
      to: email, // list of receivers
      subject: "Reset Password", // Subject line
      text: text, 
    });
  
};