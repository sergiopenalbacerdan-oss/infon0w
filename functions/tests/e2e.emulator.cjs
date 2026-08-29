"use strict";

// E2E emulator suite for the infon0w backend.
// Run with the emulators up:  node functions/tests/e2e.emulator.cjs
// Uses only localhost emulator endpoints; never touches production.

const FUNCTIONS_BASE = "http://127.0.0.1:5010/n0w-humanlens/europe-west1";
const FIRESTORE_BASE = "http://127.0.0.1:8091/v1/projects/n0w-humanlens/databases/(default)/documents";
const PUBLIC_WEB_API_KEY = "AIzaSyCzj1WBkB9cG1czAyJCcMw0aYQwKVAYrxQ";

function debugAppCheckToken() {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const header = b64({alg: "none", typ: "JWT"});
  const now = Math.floor(Date.now() / 1000);
  const payload = b64({
    app_id: "1:448829295433:web:32f30f7589f474ce1fa898",
    sub: "n0w-humanlens",
    iss: "https://firebaseappcheck.googleapis.com/448829295433",
    aud: ["projects/448829295433"],
    iat: now,
    exp: now + 3600
  });
  return `${header}.${payload}.`;
}
const APP_CHECK = debugAppCheckToken();

async function call(name, data, authToken) {
  const headers = {"Content-Type": "application/json", "X-Firebase-AppCheck": APP_CHECK};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify({data})
  });
  const body = await response.json().catch(() => ({}));
  return {status: response.status, body};
}

async function signUp(email, password) {
  const response = await fetch(`http://127.0.0.1:9097/www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${PUBLIC_WEB_API_KEY}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({email, password, returnSecureToken: true})
  });
  const body = await response.json();
  if (!body.idToken) throw new Error(`auth emulator signup failed: ${JSON.stringify(body)}`);
  return {idToken: body.idToken, localId: body.localId};
}

async function getDoc(path) {
  const response = await fetch(`${FIRESTORE_BASE}/${path}`, {
    headers: {Authorization: "Bearer owner"}
  });
  if (response.status === 404) return null;
  const body = await response.json();
  const fields = body.fields || {};
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) out[key] = value.stringValue;
    else if (value.integerValue !== undefined) out[key] = Number(value.integerValue);
    else if (value.booleanValue !== undefined) out[key] = value.booleanValue;
    else if (value.mapValue) out[key] = "(map)";
    else out[key] = "(other)";
  }
  return out;
}

function envelope(kind, payload, overrides = {}) {
  return {
    kind,
    locale: "es",
    website: "",
    startedAt: Date.now() - 5000,
    payload,
    ...overrides
  };
}

const PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const RUN = Date.now().toString(36);

async function resetRateLimits() {
  const listUrl = `${FIRESTORE_BASE}/infon0w_rate_limits?pageSize=200`;
  const response = await fetch(listUrl, {headers: {Authorization: "Bearer owner"}});
  const body = await response.json().catch(() => ({}));
  const docs = body.documents || [];
  for (const doc of docs) {
    await fetch(`http://127.0.0.1:8091/v1/${doc.name}`, {
      method: "DELETE",
      headers: {Authorization: "Bearer owner"}
    });
  }
  return docs.length;
}

let passed = 0;
let failed = 0;
function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name} ${detail ? "→ " + detail : ""}`);
  }
}
const errCode = (res) => `${res.body?.error?.message || ""} ${res.body?.error?.status || ""}`;

async function main() {
  console.log("E2E infon0w (emuladores)");
  const cleared = await resetRateLimits();
  console.log(`[0] Rate limits del emulador reiniciados (${cleared} entradas borradas)`);

  console.log("\n[1] Envíos felices por tipo");
  let succeeded = 0;
  const apCounterBefore = Number((await getDoc("infon0w_counters/ap"))?.value || 0);
  const memberCounterBefore = Number((await getDoc("infon0w_counters/member"))?.value || 0);
  const statsBefore = Number((await getDoc("infon0w_public/stats"))?.total || 0);
  const ap = await call("infon0wSubmit", envelope("AP", {
    title: "Taller de carpintería básica",
    description: "Puedo enseñar carpintería básica durante dos tardes a la semana.",
    category: "knowledge",
    location: "Albacete",
    contactName: "Ada Ejemplo",
    email: `ada.${RUN}@ejemplo.com`,
    phone: "+34 600 000 001",
    consent: true
  }, {attachments: [{name: "foto.png", type: "image/png", data: PNG_1PX}]}));
  check("AP acepta con adjunto", ap.body?.result?.ok === true, JSON.stringify(ap.body).slice(0, 200));
  if (ap.body?.result?.ok) succeeded += 1;
  check("AP referencia AP-", /^AP-\d{6}$/.test(ap.body?.result?.reference || ""), ap.body?.result?.reference);
  check("AP status received", ap.body?.result?.status === "received");

  const ne = await call("infon0wSubmit", envelope("NE", {
    title: "Necesito un local para un taller",
    description: "Busco un espacio cedido para impartir un taller semanal de música.",
    category: "space",
    location: "Albacete",
    contactName: "Bruno Ejemplo",
    email: `bruno.${RUN}@ejemplo.com`,
    consent: true
  }));
  check("NE acepta", ne.body?.result?.ok === true, JSON.stringify(ne.body).slice(0, 200));
  if (ne.body?.result?.ok) succeeded += 1;

  const co = await call("infon0wSubmit", envelope("CO", {
    title: "Cesión de sala de reuniones",
    description: "Ofrezco la sala de reuniones de nuestra oficina los viernes por la tarde.",
    collaborationType: "cesión de espacio",
    contactName: "Clara Ejemplo",
    email: `clara.${RUN}@ejemplo.com`,
    consent: true
  }));
  check("CO acepta", co.body?.result?.ok === true, JSON.stringify(co.body).slice(0, 200));
  if (co.body?.result?.ok) succeeded += 1;

  const member = await call("infon0wSubmit", envelope("MEMBER", {
    fullName: "Dani Ejemplo",
    email: `dani.${RUN}@ejemplo.com`,
    phone: "+34 600 000 002",
    contribution: "Diseño gráfico",
    need: "Contactos culturales",
    paymentMethod: "sepa",
    consent: true
  }));
  const memberOk = member.body?.result?.ok === true;
  const memberLimited = /rate_limit:exceeded|RESOURCE_EXHAUSTED/.test(JSON.stringify(member.body));
  check("MEMBER acepta (o rate limit residual del emulador)", memberOk || memberLimited, JSON.stringify(member.body).slice(0, 200));
  if (memberOk) {
    check("MEMBER referencia SOC-", /^SOC-\d{6}$/.test(member.body?.result?.reference || ""), member.body?.result?.reference);
    check("MEMBER pago NO iniciado", member.body?.result?.paymentStatus === "not_initiated");
    check("MEMBER email no configurado (honesto)", member.body?.result?.emailStatus === "not_configured");
  }

  const sug = await call("infon0wSubmit", envelope("SUGGESTION", {
    text: "Estaría bien un boletín mensual con las novedades del proyecto.",
    email: "",
    consent: true
  }));
  const sugOk = sug.body?.result?.ok === true;
  const sugLimited = /resource-exhausted|RESOURCE/i.test(JSON.stringify(sug.body));
  check("SUGGESTION acepta (o rate limit residual del emulador)", sugOk || sugLimited, JSON.stringify(sug.body).slice(0, 200));
  if (sugOk) succeeded += 1;

  const contact = await call("infon0wSubmit", envelope("CONTACT", {
    subject: "Consulta de prensa",
    message: "Queremos cubrir el proyecto en un medio local, ¿con quién hablamos?",
    contactName: "Elena Ejemplo",
    email: `elena.${RUN}@ejemplo.com`,
    consent: true
  }));
  check("CONTACT acepta", contact.body?.result?.ok === true, JSON.stringify(contact.body).slice(0, 200));
  if (contact.body?.result?.ok) succeeded += 1;

  const user = await signUp(`e2e-user.${RUN}@infon0w.test`, "clave-segura-123");
  const project = await call("infon0wSubmit", envelope("PROJECT", {
    title: "Punto físico n0w Albacete",
    description: "Un espacio estable donde celebrar encuentros, talleres y sesiones del proyecto.",
    location: "Albacete centro"
  }), user.idToken);
  check("PROJECT autenticado acepta", project.body?.result?.ok === true, JSON.stringify(project.body).slice(0, 200));
  if (project.body?.result?.ok) succeeded += 1;
  check("PROJECT referencia PRO-", /^PRO-\d{6}$/.test(project.body?.result?.reference || ""), project.body?.result?.reference);

  const virtual = await call("infon0wSubmit", envelope("VIRTUAL", {
    projectReference: "N0W-ONLINE",
    message: "Quiero participar en las sesiones virtuales de los jueves."
  }), user.idToken);
  check("VIRTUAL autenticado acepta", virtual.body?.result?.ok === true, JSON.stringify(virtual.body).slice(0, 200));
  if (virtual.body?.result?.ok) succeeded += 1;

  console.log("\n[2] Separación PII en Firestore");
  const recordId = ap.body?.result?.recordId;
  const record = await getDoc(`infon0w_records/${recordId}`);
  const priv = await getDoc(`infon0w_private/${recordId}`);
  check("registro funcional persiste", !!record && record.kind === "AP", JSON.stringify(record));
  check("registro NO contiene email", record && !("email" in record) && !("contactName" in record));
  check("bloque privado contiene email", !!priv && priv.email === `ada.${RUN}@ejemplo.com`, JSON.stringify(priv));
  const apCounterAfter = Number((await getDoc("infon0w_counters/ap"))?.value || 0);
  check("contador AP incrementado", apCounterAfter === apCounterBefore + 1, `${apCounterBefore} -> ${apCounterAfter}`);
  const memberCounterAfter = Number((await getDoc("infon0w_counters/member"))?.value || 0);
  if (memberOk) {
    check("contador socio consecutivo", memberCounterAfter === memberCounterBefore + 1, `${memberCounterBefore} -> ${memberCounterAfter}`);
  } else {
    check("contador socio sin cambios (MEMBER limitado)", memberCounterAfter === memberCounterBefore, `${memberCounterBefore} -> ${memberCounterAfter}`);
  }
  const statsAfter = Number((await getDoc("infon0w_public/stats"))?.total || 0);
  check("stats públicas agregadas", statsAfter >= statsBefore + succeeded, `${statsBefore} -> ${statsAfter} (esperados +${succeeded})`);

  console.log("\n[3] Recuperación de registros y media");
  const records = await call("infon0wGetMyRecords", {}, user.idToken);
  check("mis registros devuelve los del usuario", Array.isArray(records.body?.result?.records) && records.body.result.records.length === 2, JSON.stringify(records.body).slice(0, 200));
  const recordsAnon = await call("infon0wGetMyRecords", {});
  check("mis registros exige auth", recordsAnon.status !== 200 && /unauthenticated/i.test(errCode(recordsAnon)), `${recordsAnon.status} ${errCode(recordsAnon)}`);

  const apAuth = await call("infon0wSubmit", envelope("AP", {
    title: "Aportación con sesión iniciada",
    description: "Registro de prueba enviado con sesión para verificar la propiedad del adjunto.",
    category: "other",
    location: "",
    contactName: "E2E Usuario",
    email: `e2e-user.${RUN}@infon0w.test`,
    consent: true
  }, {attachments: [{name: "imagen.png", type: "image/png", data: PNG_1PX}]}), user.idToken);
  check("AP autenticada acepta", apAuth.body?.result?.ok === true);
  const media = await call("infon0wGetMedia", {recordId: apAuth.body?.result?.recordId, index: 0}, user.idToken);
  check("media propia se recupera", media.body?.result?.ok === true && media.body.result.contentType === "image/jpeg", JSON.stringify(media.body).slice(0, 160));
  const other = await signUp(`e2e-other.${RUN}@infon0w.test`, "clave-segura-456");
  const mediaCross = await call("infon0wGetMedia", {recordId: apAuth.body?.result?.recordId, index: 0}, other.idToken);
  check("media ajena denegada", mediaCross.status !== 200 && /permission|ownership/i.test(errCode(mediaCross)), `${mediaCross.status} ${errCode(mediaCross)}`);

  console.log("\n[4] Seguridad");
  const honeypot = await call("infon0wSubmit", envelope("SUGGESTION", {
    text: "Mensaje automático con campo trampa relleno por un bot.",
    consent: true
  }, {website: "https://spam.example"}));
  check("honeypot rechaza", honeypot.status !== 200 && /honeypot|permission/i.test(errCode(honeypot)), `${honeypot.status} ${errCode(honeypot)}`);

  const tooFast = await call("infon0wSubmit", envelope("SUGGESTION", {
    text: "Mensaje enviado demasiado rápido para ser humano.",
    consent: true
  }, {startedAt: Date.now()}));
  check("timing rechaza envío instantáneo", tooFast.status !== 200 && /failed-precondition|FAILED/i.test(JSON.stringify(tooFast.body)), JSON.stringify(tooFast.body).slice(0, 160));

  const badKind = await call("infon0wSubmit", envelope("HACK", {text: "da igual", consent: true}));
  check("kind desconocido rechaza", badKind.status !== 200);

  const noConsent = await call("infon0wSubmit", envelope("CO", {
    title: "Colaboración sin consentimiento",
    description: "Este envío no incluye el consentimiento obligatorio.",
    collaborationType: "otra",
    contactName: "Bot Bot",
    email: "bot@ejemplo.com",
    consent: false
  }));
  check("consentimiento obligatorio", noConsent.status !== 200);

  const badMime = await call("infon0wSubmit", envelope("AP", {
    title: "Adjunto con MIME inválido",
    description: "Intento de subir un SVG con trampa para verificar el filtro.",
    category: "other",
    contactName: "E2E",
    email: "mime@ejemplo.com",
    consent: true
  }, {attachments: [{name: "x.svg", type: "image/svg+xml", data: "PHN2Zz4="}]}));
  check("MIME svg rechazado", badMime.status !== 200);

  const projectAnon = await call("infon0wSubmit", envelope("PROJECT", {
    title: "Proyecto sin sesión",
    description: "Este envío debería exigir autenticación obligatoria.",
    location: "Ninguna"
  }));
  check("PROJECT sin auth denegado", projectAnon.status !== 200 && /unauthenticated|auth:required/i.test(errCode(projectAnon)), `${projectAnon.status} ${errCode(projectAnon)}`);

  const humanlensNoAuth = await call("infon0wHumanLensSnapshot", {});
  check("humanlens no requiere auth (público agregado)", humanlensNoAuth.body?.result?.ok === true);

  const noAppCheck = await fetch(`${FUNCTIONS_BASE}/infon0wHumanLensSnapshot`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({data: {}})
  });
  check("sin App Check se rechaza", noAppCheck.status !== 200, String(noAppCheck.status));

  console.log("\n[5] Rate limiting");
  let limited = null;
  for (let index = 0; index < 8 && !limited; index += 1) {
    const res = await call("infon0wSubmit", envelope("SUGGESTION", {
      text: `Sugerencia número ${index} para forzar el límite de peticiones.`,
      consent: true
    }));
    if (res.status !== 200 && /resource-exhausted|RESOURCE/i.test(JSON.stringify(res.body))) limited = res;
  }
  check("rate limit entra tras el límite", !!limited, "no se alcanzó el límite en 8 intentos");

  console.log(`\nResultado: ${passed} PASS / ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("E2E roto:", error);
  process.exit(1);
});
