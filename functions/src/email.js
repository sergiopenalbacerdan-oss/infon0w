"use strict";

const {Resend} = require("resend");
const {defineSecret} = require("firebase-functions/params");

const apiKeySecret = defineSecret("INFON0W_EMAIL_API_KEY");
const fromSecret = defineSecret("INFON0W_EMAIL_FROM");
const replyToSecret = defineSecret("INFON0W_EMAIL_REPLY_TO");
const adminEmailSecret = defineSecret("INFON0W_ADMIN_EMAIL");

function getResendClient() {
  const apiKey = apiKeySecret.value();
  if (!apiKey || apiKey === "placeholder-replace-with-real-key") return null;
  return new Resend(apiKey);
}

function fromAddress() {
  return fromSecret.value() || "n0w <noreply@infon0w.com>";
}

function replyToAddress() {
  return replyToSecret.value() || fromAddress();
}

function adminAddress() {
  return adminEmailSecret.value() || "sergiopenalbacerdan@gmail.com";
}

async function sendResendEmail({from, to, subject, html, text, replyTo}) {
  const client = getResendClient();
  if (!client) return {status: "pending_configuration"};
  try {
    const result = await client.emails.send({
      from: from || fromAddress(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim(),
      replyTo: replyTo || replyToAddress()
    });
    return {status: result.error ? "failed" : "sent", provider: "resend", providerMessageId: result.data?.id || null, error: result.error || null};
  } catch (error) {
    return {status: "failed", provider: "resend", error: error.message || String(error)};
  }
}

async function sendUserEmail(kind, to, data) {
  const subject = `infon0w · Registro confirmado · ${data.reference || ""}`;
  const html = `<p>Hola,</p><p>Hemos recibido tu registro en infon0w.</p><ul><li><strong>Referencia:</strong> ${data.reference || ""}</li><li><strong>Fecha:</strong> ${data.date || ""}</li><li><strong>Estado:</strong> ${data.statusLabel || "Recibido"}</li></ul><p>Guarda esta referencia para cualquier consulta.</p><p>Asociación Cultural y Social n0w</p>`;
  return sendResendEmail({to, subject, html});
}

async function sendAdminEmail(kind, data) {
  const subject = `infon0w · Nuevo ${kind} · ${data.reference || ""}`;
  const html = `<p>Nuevo registro en infon0w.</p><ul><li><strong>Tipo:</strong> ${kind}</li><li><strong>Referencia:</strong> ${data.reference || ""}</li><li><strong>Fecha:</strong> ${data.date || ""}</li><li><strong>Estado:</strong> ${data.statusLabel || "Recibido"}</li></ul><p>Revisa Firestore para más detalles.</p>`;
  return sendResendEmail({to: [adminAddress()], subject, html});
}

module.exports = {
  apiKeySecret,
  fromSecret,
  replyToSecret,
  adminEmailSecret,
  getResendClient,
  fromAddress,
  replyToAddress,
  adminAddress,
  sendUserEmail,
  sendAdminEmail
};
