---
title: Zotero API key — step by step
layout: default
---

# Zotero API key — step by step

Theoryscope reads your corpus straight from Zotero. To do that it needs three pieces of information: your library ID, your library type (user or group), and a private API key. This page walks through getting each one, with the pitfalls that trip people up.

> **The only "API key" Theoryscope needs is a Zotero key.** It does not call OpenAI, Anthropic, HuggingFace Hub, or any other commercial API. All embedding models download once from HuggingFace (no token required for public models) and then run locally.

Credentials are stored in your browser only and are posted directly to your local backend on each request. They never leave your machine.

---

## 1. Create or sign in to a Zotero account

Visit [zotero.org](https://www.zotero.org/) and sign in, or create a free account.

![Zotero sign-in page](images/zotero-01-signin.png)

> If you want to analyse a corpus you already keep elsewhere, the easiest way is to make a group library in Zotero, drag the items in, and point Theoryscope at the group. See [working with group libraries](#working-with-group-libraries) below.

---

## 2. Find your library ID

Go to [zotero.org/settings/keys](https://www.zotero.org/settings/keys). At the top of the page Zotero prints a line like:

> **Your userID for use in API calls is 1234567**

Copy that number. That is your **library ID** for a user library.

![Zotero API Keys page highlighting the user ID line](images/zotero-02-user-id.png)

**Common mistakes:**

- **Do not use your Zotero username.** The library ID is a plain integer. "dmberry" is a username; `1234567` is the library ID.
- **Do not use the number in the URL of a published item** (e.g. `zotero.org/dmberry/items/ABCDEFG`). That is an item key, not a library ID.
- **For group libraries, the library ID is the group's number, not your user ID.** See [working with group libraries](#working-with-group-libraries).

---

## 3. Create a private API key

On the same [zotero.org/settings/keys](https://www.zotero.org/settings/keys) page, click **Create new private key**.

![The Create new private key button](images/zotero-03-create-key-button.png)

Fill in the form:

- **Key Description** — anything you want. "Theoryscope" is fine.
- **Personal Library — Allow library access** — tick this box. If it is not ticked, the key cannot read anything, and Theoryscope will return an empty corpus.
- **Allow notes access** — optional. Theoryscope does not use notes, so leave it unticked unless you want to.
- **Allow write access** — leave *unticked*. Theoryscope only reads.
- **Default Group Permissions** — leave as **No access** unless you also want to use a group library through this same key (see below).

![The private key permissions form, with "Allow library access" ticked](images/zotero-04-key-permissions.png)

Click **Save Key**.

Zotero will show the new key *once*, as a long alphanumeric string:

![The newly created key, shown once](images/zotero-05-key-shown-once.png)

> **Copy the key immediately.** Zotero will not show it again. If you lose it you have to delete the key and create a new one.

---

## 4. Enter the credentials in Theoryscope

In Theoryscope, open the **Corpus Source** panel and choose **Zotero**.

Fill in:

- **Library ID** — the number from step 2 (e.g. `1234567`).
- **Library type** — `user` for your personal library, `group` for a group library.
- **API key** — the string from step 3.

![Theoryscope's Zotero credentials panel](images/theoryscope-zotero-panel.png)

Click **Connect**. If the credentials are correct, Theoryscope will fetch your collection tree and let you choose which collection or saved search to embed.

---

## Working with group libraries

Group libraries are the recommended way to analyse a specific corpus without mixing it with your personal library.

1. In Zotero, create a new group at [zotero.org/groups/new](https://www.zotero.org/groups/new). "Private" is fine — Theoryscope only needs to be able to read it.
2. Drag or import the items you want to analyse into the group library.
3. Open the group's page. The URL will look like `https://www.zotero.org/groups/1234567/short-name`. The number `1234567` is the **group's library ID** — use that in Theoryscope, not your personal user ID.
4. In the key permissions form at [zotero.org/settings/keys](https://www.zotero.org/settings/keys), set **Default Group Permissions** to **Read Only**, or edit the specific group and give that key read access.
5. In Theoryscope, set **Library type** to `group` and paste the group's library ID.

![Finding the group library ID in the group URL](images/zotero-06-group-id.png)

---

## Troubleshooting

**"Forbidden" or empty corpus returned.**
Your key does not have library access for that library. Go back to [zotero.org/settings/keys](https://www.zotero.org/settings/keys), click **Edit** on the key, and make sure the appropriate "Allow library access" box is ticked. For a group library, the group itself must also be listed with read permission.

**"Invalid library" or 404 responses.**
The library ID is wrong, or the library type does not match. A user ID with `library type = group` will not resolve. A group number with `library type = user` will not resolve either.

**I can see items but Theoryscope only shows a handful.**
Theoryscope paginates through the Zotero API in blocks of 100. If a request fails mid-stream you may see a partial corpus. Reconnect in the panel to re-fetch.

**I rotated my key and now it does not work.**
A rotated key is a new key. Delete the old one in Zotero to avoid confusion, create a new one, and paste the new value into the Theoryscope panel. Theoryscope stores the key in your browser's local storage, not in a file, so clearing site data for `localhost:3000` resets it.

**I do not want my key on disk.**
It is not on disk. Theoryscope keeps it in `localStorage` for your browser session, and the backend holds it only in memory for the duration of a single request (it is never written to the cache, logs, or provenance record).

---

## What about other APIs?

Theoryscope does not use OpenAI, Anthropic, Cohere, Voyage, or any other commercial embedding or generative API. The embedding models are open-weight (`sentence-transformers/all-MiniLM-L6-v2` by default, with `all-mpnet-base-v2` and `BAAI/bge-small-en-v1.5` as alternatives for the Embedding Dependence Probe) and run locally on your machine. The Corpus-vs-Model Probe uses small open-weight generative models (`SmolLM2`, `GPT-2`) downloaded from HuggingFace, also run locally. The first run of a model downloads ~90 MB – 1.5 GB depending on the model; subsequent runs are offline.

The only exception is Zotero, which is where your corpus lives.
