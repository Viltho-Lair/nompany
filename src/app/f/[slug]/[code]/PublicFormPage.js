"use client";
// The public form's one client piece: it hands PublicForm the two ways it
// speaks to the server — sending the answers, and sending a file before them.

import PublicForm from "@/components/forms/PublicForm";

/**
 * WHERE THIS PERSON CAME FROM (22/09/2026, modules/marketing/arrival).
 *
 * READ HERE BECAUSE NOWHERE ELSE CAN. The five UTM tags are on the address the
 * visitor clicked and the referrer is the browser's own; neither reaches the
 * server on the submit request, which arrives from this page rather than from
 * the advert. Campaigns have been publishing tagged links since Marketing
 * shipped and nothing had ever read one back.
 *
 * READ AT SUBMIT, not at load, and it is the same answer: a multi-page form is
 * one client page, so the query is still there when they finish. Doing it at
 * submit means nothing to keep in state and nothing to lose on a reload.
 *
 * IN AN IFRAME THIS IS THE EMBEDDING PAGE, which is the truth rather than a
 * defect: the referrer is then the studio's own site, the tags are whatever
 * that page put on the embed's src, and "this came from our website" is the
 * correct answer for a form embedded in it.
 *
 * IT FAILS QUIETLY. This is decoration on an answer somebody is trying to send;
 * a browser that refuses `document.referrer`, or an address the URL parser will
 * not take, must never cost them their submission.
 */
function arrival() {
  try {
    const q = new URLSearchParams(window.location.search);
    return {
      source: q.get("utm_source") || "",
      medium: q.get("utm_medium") || "",
      campaign: q.get("utm_campaign") || "",
      content: q.get("utm_content") || "",
      term: q.get("utm_term") || "",
      // Sent whole; the server keeps the HOST alone, because the rest is
      // somebody else's page address and frequently their own query string.
      referrer: document.referrer || "",
    };
  } catch {
    return null;
  }
}

export default function PublicFormPage({ slug, code, form }) {
  const submit = async (body) => {
    const res = await fetch(`/api/f/${slug}/${code}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, arrival: arrival() }),
    });
    return res.json().catch(() => ({ ok: false, error: "failed" }));
  };
  // ONE FILE AT A TIME, as a multipart body. The answer stores the id this
  // hands back — never the file itself, and never a URL: the studio's members
  // read it through /api/media, and the person who sent it does not.
  const upload = async (questionId, file) => {
    const body = new FormData();
    body.append("questionId", questionId);
    body.append("file", file);
    const res = await fetch(`/api/f/${slug}/${code}/upload`, { method: "POST", body });
    const out = await res.json().catch(() => ({}));
    return res.ok && out?.file ? out.file : { error: out?.error || "failed" };
  };
  return <PublicForm form={form} onSubmit={submit} onUpload={upload} />;
}
