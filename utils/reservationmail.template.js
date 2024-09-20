exports.getReservationEmailTemplate = function (booking, link) {
    return `<!--
-->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  lang="en"
>
  <head>
    <title></title>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <!--[if !mso]>-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <!--<![endif]-->
    <meta name="x-apple-disable-message-reformatting" content="" />
    <meta content="target-densitydpi=device-dpi" name="viewport" />
    <meta content="true" name="HandheldFriendly" />
    <meta content="width=device-width" name="viewport" />
    <meta
      name="format-detection"
      content="telephone=no, date=no, address=no, email=no, url=no"
    />
    <style type="text/css">
      table {
        border-collapse: separate;
        table-layout: fixed;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
      }
      table td {
        border-collapse: collapse;
      }
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass font,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 100%;
      }
      body,
      a,
      li,
      p,
      h1,
      h2,
      h3 {
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%;
      }
      html {
        -webkit-text-size-adjust: none !important;
      }
      body,
      #innerTable {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      #innerTable img + div {
        display: none;
        display: none !important;
      }
      img {
        margin: 0;
        padding: 0;
        -ms-interpolation-mode: bicubic;
      }
      h1,
      h2,
      h3,
      p,
      a {
        line-height: inherit;
        overflow-wrap: normal;
        white-space: normal;
        word-break: break-word;
      }
      a {
        text-decoration: none;
      }
      h1,
      h2,
      h3,
      p {
        min-width: 100% !important;
        width: 100% !important;
        max-width: 100% !important;
        display: inline-block !important;
        border: 0;
        padding: 0;
        margin: 0;
      }
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: none !important;
        font-size: inherit !important;
        font-family: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
      }
      u + #body a {
        color: inherit;
        text-decoration: none;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        line-height: inherit;
      }
      a[href^="mailto"],
      a[href^="tel"],
      a[href^="sms"] {
        color: inherit;
        text-decoration: none;
      }
      img,
      p {
        margin: 0;
        margin: 0;
        font-family: Poppins, BlinkMacSystemFont, Segoe UI, Helvetica Neue,
          Arial, sans-serif;
        line-height: 22px;
        font-weight: 400;
        font-style: normal;
        font-size: 16px;
        text-decoration: none;
        text-transform: none;
        letter-spacing: 0;
        direction: ltr;
        color: #454545;
        text-align: left;
        mso-line-height-rule: exactly;
        mso-text-raise: 2px;
      }
      h1 {
        margin: 0;
        margin: 0;
        font-family: Roboto, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
          sans-serif;
        line-height: 34px;
        font-weight: 400;
        font-style: normal;
        font-size: 28px;
        text-decoration: none;
        text-transform: none;
        letter-spacing: 0;
        direction: ltr;
        color: #333;
        text-align: left;
        mso-line-height-rule: exactly;
        mso-text-raise: 2px;
      }
      h2 {
        margin: 0;
        margin: 0;
        font-family: Lato, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
          sans-serif;
        line-height: 30px;
        font-weight: 400;
        font-style: normal;
        font-size: 24px;
        text-decoration: none;
        text-transform: none;
        letter-spacing: 0;
        direction: ltr;
        color: #333;
        text-align: left;
        mso-line-height-rule: exactly;
        mso-text-raise: 2px;
      }
      h3 {
        margin: 0;
        margin: 0;
        font-family: Lato, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
          sans-serif;
        line-height: 26px;
        font-weight: 400;
        font-style: normal;
        font-size: 20px;
        text-decoration: none;
        text-transform: none;
        letter-spacing: 0;
        direction: ltr;
        color: #333;
        text-align: left;
        mso-line-height-rule: exactly;
        mso-text-raise: 2px;
      }
    </style>
    <style type="text/css">
      @media (min-width: 481px) {
        .hd {
          display: none !important;
        }
      }
    </style>
    <style type="text/css">
      @media (max-width: 480px) {
        .hm {
          display: none !important;
        }
      }
    </style>
    <style type="text/css">
      @media (min-width: 481px) {
        h1,
        img,
        p {
          margin: 0;
          margin: 0;
        }
        .t32,
        .t36,
        .t5 {
          width: 510px !important;
        }
        img,
        p {
          font-family: Poppins, BlinkMacSystemFont, Segoe UI, Helvetica Neue,
            Arial, sans-serif;
          line-height: 22px;
          font-weight: 400;
          font-style: normal;
          font-size: 16px;
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          direction: ltr;
          color: #454545;
          text-align: left;
          mso-line-height-rule: exactly;
          mso-text-raise: 2px;
        }
        h1 {
          font-family: Roboto, BlinkMacSystemFont, Segoe UI, Helvetica Neue,
            Arial, sans-serif;
          line-height: 34px;
          font-weight: 400;
          font-style: normal;
          font-size: 28px;
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          direction: ltr;
          color: #333;
          text-align: left;
          mso-line-height-rule: exactly;
          mso-text-raise: 2px;
        }
        h2,
        h3 {
          margin: 0;
          margin: 0;
          font-family: Lato, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
            sans-serif;
          font-weight: 400;
          font-style: normal;
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          direction: ltr;
          color: #333;
          text-align: left;
          mso-line-height-rule: exactly;
          mso-text-raise: 2px;
        }
        h2 {
          line-height: 30px;
          font-size: 24px;
        }
        h3 {
          line-height: 26px;
          font-size: 20px;
        }
        .t36 {
          padding-left: 60px !important;
          padding-right: 60px !important;
        }
        .t13 {
          width: 490px !important;
        }
        .t11 {
          width: 462px !important;
        }
        .t30 {
          text-align: left !important;
        }
        .t19 {
          mso-line-height-alt: 0px !important;
          line-height: 0 !important;
          display: none !important;
        }
        .t21 {
          width: 22.98817% !important;
          max-width: 212px !important;
        }
        .t20,
        .t28 {
          padding-left: 22px !important;
          padding-right: 22px !important;
        }
        .t29 {
          width: 77.01183% !important;
          max-width: 844px !important;
        }
        .t23 {
          width: 348.76px !important;
        }
      }
    </style>
    <style type="text/css">
      @media (min-width: 481px) {
        [class~="x_t36"] {
          padding-left: 60px !important;
          padding-right: 60px !important;
          width: 510px !important;
        }
        [class~="x_t5"] {
          width: 510px !important;
        }
        [class~="x_t13"] {
          width: 490px !important;
        }
        [class~="x_t11"] {
          width: 462px !important;
        }
        [class~="x_t32"] {
          width: 510px !important;
        }
        [class~="x_t30"] {
          text-align: left !important;
        }
        [class~="x_t19"] {
          mso-line-height-alt: 0px !important;
          line-height: 0px !important;
          display: none !important;
        }
        [class~="x_t21"] {
          width: 22.98817% !important;
          max-width: 212px !important;
        }
        [class~="x_t20"] {
          padding-left: 22px !important;
          padding-right: 22px !important;
        }
        [class~="x_t29"] {
          width: 77.01183% !important;
          max-width: 844px !important;
        }
        [class~="x_t28"] {
          padding-left: 22px !important;
          padding-right: 22px !important;
        }
        [class~="x_t23"] {
          width: 348.76px !important;
        }
      }
    </style>
    <style type="text/css" media="screen and (min-width:481px)">
      .moz-text-html img,
      .moz-text-html p {
        margin: 0;
        margin: 0;
        font-family: Poppins, BlinkMacSystemFont, Segoe UI, Helvetica Neue,
          Arial, sans-serif;
        line-height: 22px;
        font-weight: 400;
        font-style: normal;
        font-size: 16px;
        text-decoration: none;
        text-transform: none;
        letter-spacing: 0;
        direction: ltr;
        color: #454545;
        text-align: left;
        mso-line-height-rule: exactly;
        mso-text-raise: 2px;
      }
      .moz-text-html h1 {
        margin: 0;
        margin: 0;
        font-family: Roboto, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
          sans-serif;
        line-height: 34px;
        font-weight: 400;
        font-style: normal;
        font-size: 28px;
        text-decoration: none;
        text-transform: none;
        letter-spacing: 0;
        direction: ltr;
        color: #333;
        text-align: left;
        mso-line-height-rule: exactly;
        mso-text-raise: 2px;
      }
      .moz-text-html h2 {
        margin: 0;
        margin: 0;
        font-family: Lato, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
          sans-serif;
        line-height: 30px;
        font-weight: 400;
        font-style: normal;
        font-size: 24px;
        text-decoration: none;
        text-transform: none;
        letter-spacing: 0;
        direction: ltr;
        color: #333;
        text-align: left;
        mso-line-height-rule: exactly;
        mso-text-raise: 2px;
      }
      .moz-text-html h3 {
        margin: 0;
        margin: 0;
        font-family: Lato, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
          sans-serif;
        line-height: 26px;
        font-weight: 400;
        font-style: normal;
        font-size: 20px;
        text-decoration: none;
        text-transform: none;
        letter-spacing: 0;
        direction: ltr;
        color: #333;
        text-align: left;
        mso-line-height-rule: exactly;
        mso-text-raise: 2px;
      }
      .moz-text-html .t36 {
        padding-left: 60px !important;
        padding-right: 60px !important;
        width: 510px !important;
      }
      .moz-text-html .t5 {
        width: 510px !important;
      }
      .moz-text-html .t13 {
        width: 490px !important;
      }
      .moz-text-html .t11 {
        width: 462px !important;
      }
      .moz-text-html .t32 {
        width: 510px !important;
      }
      .moz-text-html .t30 {
        text-align: left !important;
      }
      .moz-text-html .t19 {
        mso-line-height-alt: 0px !important;
        line-height: 0 !important;
        display: none !important;
      }
      .moz-text-html .t21 {
        width: 22.98817% !important;
        max-width: 212px !important;
      }
      .moz-text-html .t20 {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }
      .moz-text-html .t29 {
        width: 77.01183% !important;
        max-width: 844px !important;
      }
      .moz-text-html .t28 {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }
      .moz-text-html .t23 {
        width: 348.76px !important;
      }
    </style>
    <!--[if !mso]>-->
    <link
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&amp;display=swap"
      rel="stylesheet"
      type="text/css"
    />
    <!--<![endif]-->
    <!--[if mso]>
      <style type="text/css">
        img,
        p {
          margin: 0;
          margin: 0;
          font-family: Poppins, BlinkMacSystemFont, Segoe UI, Helvetica Neue,
            Arial, sans-serif;
          line-height: 22px;
          font-weight: 400;
          font-style: normal;
          font-size: 16px;
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          direction: ltr;
          color: #454545;
          text-align: left;
          mso-line-height-rule: exactly;
          mso-text-raise: 2px;
        }
        h1 {
          margin: 0;
          margin: 0;
          font-family: Roboto, BlinkMacSystemFont, Segoe UI, Helvetica Neue,
            Arial, sans-serif;
          line-height: 34px;
          font-weight: 400;
          font-style: normal;
          font-size: 28px;
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          direction: ltr;
          color: #333;
          text-align: left;
          mso-line-height-rule: exactly;
          mso-text-raise: 2px;
        }
        h2 {
          margin: 0;
          margin: 0;
          font-family: Lato, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
            sans-serif;
          line-height: 30px;
          font-weight: 400;
          font-style: normal;
          font-size: 24px;
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          direction: ltr;
          color: #333;
          text-align: left;
          mso-line-height-rule: exactly;
          mso-text-raise: 2px;
        }
        h3 {
          margin: 0;
          margin: 0;
          font-family: Lato, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial,
            sans-serif;
          line-height: 26px;
          font-weight: 400;
          font-style: normal;
          font-size: 20px;
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          direction: ltr;
          color: #333;
          text-align: left;
          mso-line-height-rule: exactly;
          mso-text-raise: 2px;
        }
        td.t36 {
          padding-left: 60px !important;
          padding-right: 60px !important;
        }
        div.t30 {
          text-align: left !important;
        }
        div.t19 {
          mso-line-height-alt: 0px !important;
          line-height: 0 !important;
          display: none !important;
        }
        div.t21 {
          width: 22.98817% !important;
          max-width: 212px !important;
        }
        div.t20 {
          padding-left: 22px !important;
          padding-right: 22px !important;
        }
        div.t29 {
          width: 77.01183% !important;
          max-width: 844px !important;
        }
        div.t28 {
          padding-left: 22px !important;
          padding-right: 22px !important;
        }
      </style>
    <![endif]-->
    <!--[if mso]>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG />
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    <![endif]-->
  </head>
  <body
    id="body"
    class="t40"
    style="
      min-width: 100%;
      margin: 0px;
      padding: 0px;
      background-color: #fafafa;
    "
  >
    <div class="t39" style="background-color: #fafafa">
      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        align="center"
      >
        <tr>
          <td
            class="t38"
            style="
              font-size: 0;
              line-height: 0;
              mso-line-height-rule: exactly;
              background-color: #fafafa;
            "
            valign="top"
            align="center"
          >
            <!--[if mso]>
              <v:background
                xmlns:v="urn:schemas-microsoft-com:vml"
                fill="true"
                stroke="false"
              >
                <v:fill color="#FAFAFA" />
              </v:background>
            <![endif]-->
            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              align="center"
              id="innerTable"
            >
              <tr>
                <td align="center">
                  <table
                    class="t37"
                    role="presentation"
                    cellpadding="0"
                    cellspacing="0"
                    style="margin-left: auto; margin-right: auto"
                  >
                    <tr>
                      <!--[if mso]>
<td width="630" class="t36" style="background-color:#FFFFFF;padding:40px 30px 40px 30px;">
<![endif]-->
                      <!--[if !mso]>-->
                      <td
                        class="t36"
                        style="
                          background-color: #ffffff;
                          width: 420px;
                          padding: 40px 30px 40px 30px;
                        "
                      >
                        <!--<![endif]-->
                        <table
                          role="presentation"
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          style="width: 100% !important"
                        >
                          <tr>
                            <td align="left">
                              <table
                                class="t2"
                                role="presentation"
                                cellpadding="0"
                                cellspacing="0"
                                style="margin-right: auto"
                              >
                                <tr>
                                  <!--[if mso]>
<td width="231" class="t1">
<![endif]-->
                                  <!--[if !mso]>-->
                                  <td class="t1" style="width: 231px">
                                    <!--<![endif]-->
                                    <div style="font-size: 0px">
                                      <img
                                        class="t0"
                                        style="
                                          display: block;
                                          border: 0;
                                          height: auto;
                                          width: 100%;
                                          margin: 0;
                                          max-width: 100%;
                                        "
                                        width="231"
                                        height="58.109375"
                                        alt=""
                                        src="https://314625c4-13df-4dc4-b0d4-473d2e40e097.b-cdn.net/e/2a7a3d36-56d4-4115-81c5-e3007cc43f2e/7679c671-4484-4d1f-be20-00898bb76c37.png"
                                      />
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div
                                class="t3"
                                style="
                                  mso-line-height-rule: exactly;
                                  mso-line-height-alt: 46px;
                                  line-height: 46px;
                                  font-size: 1px;
                                  display: block;
                                "
                              >
                                &nbsp;&nbsp;
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <table
                                class="t6"
                                role="presentation"
                                cellpadding="0"
                                cellspacing="0"
                                style="margin-left: auto; margin-right: auto"
                              >
                                <tr>
                                  <!--[if mso]>
<td width="510" class="t5">
<![endif]-->
                                  <!--[if !mso]>-->
                                  <td class="t5" style="width: 420px">
                                    <!--<![endif]-->
                                    <h1
                                      class="t4"
                                      style="
                                        margin: 0;
                                        margin: 0;
                                        font-family: Poppins, BlinkMacSystemFont,
                                          Segoe UI, Helvetica Neue, Arial,
                                          sans-serif;
                                        line-height: 34px;
                                        font-weight: 700;
                                        font-style: normal;
                                        font-size: 29px;
                                        text-decoration: none;
                                        text-transform: none;
                                        direction: ltr;
                                        color: #333333;
                                        text-align: left;
                                        mso-line-height-rule: exactly;
                                        mso-text-raise: 2px;
                                      "
                                    >
                                      Votre réservation est actuellement
                                      ${booking?.status}.
                                    </h1>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div
                                class="t7"
                                style="
                                  mso-line-height-rule: exactly;
                                  mso-line-height-alt: 11px;
                                  line-height: 11px;
                                  font-size: 1px;
                                  display: block;
                                "
                              >
                                &nbsp;&nbsp;
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <p
                                class="t8"
                                style="
                                  margin: 0;
                                  margin: 0;
                                  font-family: Poppins, BlinkMacSystemFont,
                                    Segoe UI, Helvetica Neue, Arial, sans-serif;
                                  line-height: 22px;
                                  font-weight: 500;
                                  font-style: normal;
                                  font-size: 16px;
                                  text-decoration: none;
                                  text-transform: none;
                                  direction: ltr;
                                  color: #454545;
                                  text-align: left;
                                  mso-line-height-rule: exactly;
                                  mso-text-raise: 2px;
                                "
                              >
                                Détails de la réservation : <br />Nom de
                                logement : ${booking?.listing?.title}<br />Numéro de
                                référence : ${booking?.ref}<br />Date
                                d&#39;arrivée : ${booking?.checkin}<br />Date
                                de départ : ${booking?.checkout}<br />Nom du client
                                : ${booking?.guest?.firstname} ${booking?.guest?.lastname}<br />Nom de
                                locataire : ${booking?.host?.firstname} ${booking?.host?.lastname}<br />
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div
                                class="t9"
                                style="
                                  mso-line-height-rule: exactly;
                                  mso-line-height-alt: 34px;
                                  line-height: 34px;
                                  font-size: 1px;
                                  display: block;
                                "
                              >
                                &nbsp;&nbsp;
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <table
                                class="t14"
                                role="presentation"
                                cellpadding="0"
                                cellspacing="0"
                                style="margin-left: auto; margin-right: auto"
                              >
                                <tr>
                                  <!--[if mso]>
<td width="510" class="t13" style="overflow:hidden;padding:10px 10px 10px 10px;border-radius:0 0 6px 6px;">
<![endif]-->
                                  <!--[if !mso]>-->
                                  <td
                                    class="t13"
                                    style="
                                      overflow: hidden;
                                      width: 400px;
                                      padding: 10px 10px 10px 10px;
                                      border-radius: 0 0 6px 6px;
                                    "
                                  >
                                    <!--<![endif]-->
                                    <table
                                      role="presentation"
                                      width="100%"
                                      cellpadding="0"
                                      cellspacing="0"
                                      style="width: 100% !important"
                                    >
                                      <tr>
                                        <td align="center">
                                          <table
                                            class="t12"
                                            role="presentation"
                                            cellpadding="0"
                                            cellspacing="0"
                                            style="
                                              margin-left: auto;
                                              margin-right: auto;
                                            "
                                          >
                                            <tr>
                                              <!--[if mso]>
<td width="490" class="t11" style="background-color:#67B6FF;overflow:hidden;text-align:center;line-height:24px;mso-line-height-rule:exactly;mso-text-raise:2px;padding:18px 14px 18px 14px;border-radius:4px 4px 4px 4px;">
<![endif]-->
                                              <!--[if !mso]>-->
                                              <td
                                                class="t11"
                                                style="
                                                  background-color: #67b6ff;
                                                  overflow: hidden;
                                                  width: 372px;
                                                  text-align: center;
                                                  line-height: 24px;
                                                  mso-line-height-rule: exactly;
                                                  mso-text-raise: 2px;
                                                  padding: 18px 14px 18px 14px;
                                                  border-radius: 4px 4px 4px 4px;
                                                "
                                              >
                                                <!--<![endif]-->
                                                <a
                                                  class="t10"
                                                  href="http://legitedunucleaire.go-viral.fr${link}"
                                                  style="
                                                    display: block;
                                                    margin: 0;
                                                    margin: 0;
                                                    font-family: Poppins,
                                                      BlinkMacSystemFont,
                                                      Segoe UI, Helvetica Neue,
                                                      Arial, sans-serif;
                                                    line-height: 24px;
                                                    font-weight: 700;
                                                    font-style: normal;
                                                    font-size: 16px;
                                                    text-decoration: none;
                                                    direction: ltr;
                                                    color: #ffffff;
                                                    text-align: center;
                                                    mso-line-height-rule: exactly;
                                                    mso-text-raise: 2px;
                                                  "
                                                  target="_blank"
                                                  >Aller au tableau de bord</a>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div
                                class="t31"
                                style="
                                  mso-line-height-rule: exactly;
                                  mso-line-height-alt: 50px;
                                  line-height: 50px;
                                  font-size: 1px;
                                  display: block;
                                "
                              >
                                &nbsp;&nbsp;
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <table
                                class="t33"
                                role="presentation"
                                cellpadding="0"
                                cellspacing="0"
                                style="margin-left: auto; margin-right: auto"
                              >
                                <tr>
                                  <!--[if mso]>
<td width="510" class="t32" style="border-bottom:2px solid #EEEEEE;border-top:2px solid #EEEEEE;padding:25px 0 25px 0;">
<![endif]-->
                                  <!--[if !mso]>-->
                                  <td
                                    class="t32"
                                    style="
                                      border-bottom: 2px solid #eeeeee;
                                      border-top: 2px solid #eeeeee;
                                      width: 420px;
                                      padding: 25px 0 25px 0;
                                    "
                                  >
                                    <!--<![endif]-->
                                    <div
                                      class="t30"
                                      style="
                                        display: inline-table;
                                        width: 100%;
                                        text-align: center;
                                        vertical-align: middle;
                                      "
                                    >
                                      <!--[if mso]>
<table role="presentation" cellpadding="0" cellspacing="0" align="left" valign="middle" width="510"><tr><td class="t16" style="width:22px;" width="22"></td><td width="73.23967" valign="middle"><![endif]-->
                                      <div
                                        class="t21"
                                        style="
                                          display: inline-table;
                                          text-align: initial;
                                          vertical-align: inherit;
                                          width: 100%;
                                          max-width: 98px;
                                        "
                                      >
                                        <div
                                          class="t20"
                                          style="padding: 0 5px 0 5px"
                                        >
                                          <table
                                            role="presentation"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            class="t18"
                                            style="width: 100% !important"
                                          >
                                            <tr>
                                              <td class="t17">
                                                <div style="font-size: 0px">
                                                  <img
                                                    class="t15"
                                                    style="
                                                      display: block;
                                                      border: 0;
                                                      height: auto;
                                                      width: 100%;
                                                      margin: 0;
                                                      max-width: 100%;
                                                    "
                                                    width="73.23966942148759"
                                                    height="73.234375"
                                                    alt=""
                                                    src="https://314625c4-13df-4dc4-b0d4-473d2e40e097.b-cdn.net/e/2a7a3d36-56d4-4115-81c5-e3007cc43f2e/c435e3bf-379b-4ce7-bf25-27b926d3bc62.png"
                                                  />
                                                </div>
                                              </td>
                                            </tr>
                                          </table>
                                          <!--[if !mso]>-->
                                          <div
                                            class="t19"
                                            style="
                                              mso-line-height-rule: exactly;
                                              mso-line-height-alt: 14px;
                                              line-height: 14px;
                                              font-size: 1px;
                                              display: block;
                                            "
                                          >
                                            &nbsp;&nbsp;
                                          </div>
                                          <!--<![endif]-->
                                        </div>
                                      </div>
                                      <!--[if mso]>
</td><td class="t16" style="width:22px;" width="22"></td><td class="t25" style="width:22px;" width="22"></td><td width="348.76033" valign="middle"><![endif]-->
                                      <div
                                        class="t29"
                                        style="
                                          display: inline-table;
                                          text-align: initial;
                                          vertical-align: inherit;
                                          width: 100%;
                                          max-width: 810px;
                                        "
                                      >
                                        <div
                                          class="t28"
                                          style="padding: 0 5px 0 5px"
                                        >
                                          <table
                                            role="presentation"
                                            width="100%"
                                            cellpadding="0"
                                            cellspacing="0"
                                            class="t27"
                                            style="width: 100% !important"
                                          >
                                            <tr>
                                              <td class="t26">
                                                <table
                                                  role="presentation"
                                                  width="100%"
                                                  cellpadding="0"
                                                  cellspacing="0"
                                                  style="width: 100% !important"
                                                >
                                                  <tr>
                                                    <td align="center">
                                                      <table
                                                        class="t24"
                                                        role="presentation"
                                                        cellpadding="0"
                                                        cellspacing="0"
                                                        style="
                                                          margin-left: auto;
                                                          margin-right: auto;
                                                        "
                                                      >
                                                        <tr>
                                                          <!--[if mso]>
<td width="348.76033057851237" class="t23">
<![endif]-->
                                                          <!--[if !mso]>-->
                                                          <td
                                                            class="t23"
                                                            style="width: 600px"
                                                          >
                                                            <!--<![endif]-->
                                                            <p
                                                              class="t22"
                                                              style="
                                                                margin: 0;
                                                                margin: 0;
                                                                font-family: Poppins,
                                                                  BlinkMacSystemFont,
                                                                  Segoe UI,
                                                                  Helvetica Neue,
                                                                  Arial,
                                                                  sans-serif;
                                                                line-height: 22px;
                                                                font-weight: 400;
                                                                font-style: normal;
                                                                font-size: 16px;
                                                                text-decoration: none;
                                                                text-transform: none;
                                                                direction: ltr;
                                                                color: #454545;
                                                                text-align: left;
                                                                mso-line-height-rule: exactly;
                                                                mso-text-raise: 2px;
                                                              "
                                                            >
                                                              N&#39;hésitez pas
                                                              à nous contacter
                                                              si vous avez des
                                                              questions ou
                                                              besoin d&#39;aide
                                                              concernant votre
                                                              réservation.
                                                            </p>
                                                          </td>
                                                        </tr>
                                                      </table>
                                                    </td>
                                                  </tr>
                                                </table>
                                              </td>
                                            </tr>
                                          </table>
                                        </div>
                                      </div>
                                      <!--[if mso]>
</td><td class="t25" style="width:22px;" width="22"></td>
</tr></table>
<![endif]-->
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div
                                class="t34"
                                style="
                                  mso-line-height-rule: exactly;
                                  mso-line-height-alt: 40px;
                                  line-height: 40px;
                                  font-size: 1px;
                                  display: block;
                                "
                              >
                                &nbsp;&nbsp;
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <p
                                class="t35"
                                style="
                                  margin: 0;
                                  margin: 0;
                                  font-family: Poppins, BlinkMacSystemFont,
                                    Segoe UI, Helvetica Neue, Arial, sans-serif;
                                  line-height: 22px;
                                  font-weight: 500;
                                  font-style: normal;
                                  font-size: 13px;
                                  text-decoration: none;
                                  text-transform: none;
                                  direction: ltr;
                                  color: #949494;
                                  text-align: left;
                                  mso-line-height-rule: exactly;
                                  mso-text-raise: 3px;
                                "
                              >
                                Go Viral - All rights reserved © 2016 - 2024
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
`
}