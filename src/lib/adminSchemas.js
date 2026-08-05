// Field schemas that drive the admin CRUD forms and list views.
// type: text | textarea | select | url ; fields ending in _ar render RTL.

export const collectionSchemas = {
  services: {
    label: "Services",
    singular: "Service",
    primary: "title_en",
    columns: [
      { name: "title_en", label: "Title" },
      { name: "icon", label: "Icon" },
    ],
    fields: [
      {
        name: "icon",
        label: "Icon",
        type: "select",
        options: ["av", "lighting", "it", "furniture", "design", "commissioning"],
      },
      { name: "title_en", label: "Title (English)", type: "text" },
      { name: "title_ar", label: "Title (Arabic)", type: "text" },
      { name: "code", label: "Service code (used in delivery references, e.g. AV)", type: "text" },
      { name: "desc_en", label: "Description (English)", type: "textarea" },
      { name: "desc_ar", label: "Description (Arabic)", type: "textarea" },
      { name: "image", label: "Image (max 1 MB)", type: "image", maxKB: 1024 },
      {
        name: "kpisText",
        label: "Completion KPIs — one per line, \"Name : weight\"",
        type: "textarea",
        placeholder: "Site survey : 10\nDesign approval : 20\nProcurement : 20\nInstallation : 30\nTesting & handover : 20",
      },
    ],
  },
  inventoryVendors: {
    label: "Vendors",
    singular: "Vendor",
    primary: "name",
    columns: [
      { name: "name", label: "Name" },
      { name: "tag", label: "Tag" },
      { name: "address", label: "Address" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "image", label: "Image (max 1 MB)", type: "image", maxKB: 1024 },
      { name: "address", label: "Address", type: "textarea" },
      { name: "tag", label: "Tag", type: "select", options: ["Local", "International"] },
      { name: "itemTypes", label: "Item types & delivery time (weeks)", type: "item-types" },
    ],
  },
  projects: {
    label: "Projects",
    singular: "Project",
    primary: "title_en",
    columns: [
      { name: "title_en", label: "Title" },
      { name: "location_en", label: "Location" },
      { name: "year", label: "Year" },
      { name: "category", label: "Category" },
    ],
    fields: [
      { name: "projectNumber", label: "Project number", type: "text" },
      { name: "stage", label: "Stage", type: "select", options: ["Received", "In Progress", "Completed"], default: "Received" },
      { name: "clientId", label: "Client (from Sales)", type: "ref-select", optionsFrom: "sales-clients", labelEn: "name" },
      { name: "title_en", label: "Title (English)", type: "text" },
      { name: "title_ar", label: "Title (Arabic)", type: "text" },
      { name: "location_en", label: "Location (English)", type: "text" },
      { name: "location_ar", label: "Location (Arabic)", type: "text" },
      { name: "locationUrl", label: "Location link (Google Maps URL)", type: "url" },
      { name: "year", label: "Year", type: "text" },
      {
        name: "category",
        label: "Category",
        type: "select-dynamic",
        optionsFrom: "services",
        optionLabel: "title_en",
      },
      { name: "desc_en", label: "Description (English)", type: "textarea" },
      { name: "desc_ar", label: "Description (Arabic)", type: "textarea" },
      { name: "image", label: "Image (max 1 MB)", type: "image", maxKB: 1024 },
      // Operational fields for the projects dashboard / SLA system.
      { name: "receivedDate", label: "Receival date", type: "date" },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "endDate", label: "End date", type: "date" },
      { name: "supportPeriodDays", label: "Complementary support period (days)", type: "number", default: 365 },
    ],
  },
  // SLA contracts, each attached to a project. Managed on /studio/projects/sla
  // and created from the projects dashboard. Visit dates are derived from the
  // contract start date, duration and number of visits (see lib/sla.js).
  slas: {
    label: "SLA Contracts",
    singular: "SLA contract",
    primary: "title",
    columns: [{ name: "title", label: "Contract" }],
    fields: [
      { name: "title", label: "Contract name / reference", type: "text" },
      { name: "projectId", label: "Project", type: "ref-select", optionsFrom: "projects", labelEn: "title_en", labelAr: "title_ar" },
      { name: "serviceIds", label: "Services covered (one or more)", type: "badge-multi", optionsFrom: "services", labelEn: "title_en", labelAr: "title_ar" },
      { name: "signingDate", label: "Signing date", type: "date" },
      { name: "startDate", label: "Contract start date", type: "date" },
      { name: "durationDays", label: "Duration (days)", type: "number", default: 365 },
      { name: "visits", label: "Number of visits", type: "number", default: 1 },
      { name: "emergencyVisits", label: "Number of emergency visits", type: "number", default: 0 },
    ],
  },
  careers: {
    label: "Careers",
    singular: "Role",
    primary: "title_en",
    columns: [
      { name: "title_en", label: "Role" },
      { name: "dept_en", label: "Department" },
      { name: "location_en", label: "Location" },
    ],
    fields: [
      { name: "title_en", label: "Title (English)", type: "text" },
      { name: "title_ar", label: "Title (Arabic)", type: "text" },
      { name: "desc_en", label: "Job description (English)", type: "richtext" },
      { name: "desc_ar", label: "Job description (Arabic)", type: "richtext" },
      { name: "dept_en", label: "Department (English)", type: "text" },
      { name: "dept_ar", label: "Department (Arabic)", type: "text" },
      { name: "location_en", label: "Location (English)", type: "text" },
      { name: "location_ar", label: "Location (Arabic)", type: "text" },
      { name: "type_en", label: "Employment type (English)", type: "text", required: true, placeholder: "Full-time / Part-time" },
      { name: "type_ar", label: "Employment type (Arabic)", type: "text", required: true, placeholder: "دوام كامل / دوام جزئي" },
    ],
  },
  previousProjects: {
    label: "Previous Projects",
    singular: "Video",
    primary: "title_en",
    columns: [
      { name: "title_en", label: "Title" },
      { name: "youtube_url", label: "YouTube URL" },
    ],
    fields: [
      { name: "title_en", label: "Title (English)", type: "text" },
      { name: "title_ar", label: "Title (Arabic)", type: "text" },
      { name: "youtube_url", label: "YouTube video URL", type: "url" },
      { name: "desc_en", label: "Description (English)", type: "textarea" },
      { name: "desc_ar", label: "Description (Arabic)", type: "textarea" },
    ],
  },
  messages: {
    label: "Messages",
    singular: "Message",
    primary: "name",
    readOnly: true,
    columns: [
      { name: "name", label: "Name" },
      { name: "email", label: "Email" },
      { name: "subject", label: "Subject" },
      { name: "createdAt", label: "Received" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "subject", label: "Subject", type: "text" },
      { name: "message", label: "Message", type: "textarea" },
    ],
  },
  galleryImages: {
    label: "Showcase Gallery",
    singular: "Image",
    primary: "title_en",
    reorderable: true,
    // Per-row on/off switches: website visibility, and whether the image is one
    // of the "Our work" picks shown in the hero side boxes.
    rowToggles: [
      { name: "visible", onLabel: "Shown", offLabel: "Hidden", default: true, title: "Show or hide on the website" },
      { name: "heroFeatured", onLabel: "In hero", offLabel: "Not in hero", default: false, title: "Show in the hero side boxes" },
    ],
    // Per-row "open in new tab" link pointing at this field's URL.
    rowImageLink: "image",
    columns: [{ name: "title_en", label: "Caption" }],
    fields: [
      { name: "title_en", label: "Caption (English, optional)", type: "text" },
      { name: "title_ar", label: "Caption (Arabic, optional)", type: "text" },
      { name: "image", label: "Image (max 1 MB)", type: "image", maxKB: 1024 },
    ],
  },
  // Employee reference lists, managed in a panel above the Employees list.
  departments: {
    label: "Departments",
    singular: "Department",
    primary: "name",
    columns: [{ name: "code", label: "Code" }, { name: "name", label: "Name" }],
    fields: [
      { name: "code", label: "Department code", type: "text", required: true },
      { name: "name", label: "Department name", type: "text", required: true },
    ],
  },
  positions: {
    label: "Positions",
    singular: "Position",
    primary: "name",
    columns: [{ name: "code", label: "Code" }, { name: "name", label: "Name" }],
    fields: [
      { name: "code", label: "Position code", type: "text", required: true },
      { name: "name", label: "Position name", type: "text", required: true },
    ],
  },
  certifications: {
    label: "Certifications",
    singular: "Certification",
    primary: "name",
    columns: [{ name: "name", label: "Name" }],
    rowImageLink: "image",
    fields: [
      { name: "name", label: "Certification name", type: "text", required: true },
      { name: "image", label: "Certification image (max 200 KB)", type: "image", maxKB: 200 },
    ],
  },
  // Named signature images shown in the Studio Company Info page. No ordering
  // needed — just a flat list you can add to / remove from.
  signatures: {
    label: "Company Signatures",
    singular: "Image",
    primary: "name",
    columns: [{ name: "name", label: "Name" }],
    rowImageLink: "image",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "image", label: "Signature image (max 200 KB)", type: "image", maxKB: 200, required: true },
    ],
  },
  reviews: {
    label: "Client Reviews",
    singular: "Review",
    primary: "name",
    readOnly: true,
    kind: "reviews",
    columns: [
      { name: "name", label: "Client" },
      { name: "position", label: "Position" },
      { name: "rating", label: "Rating" },
      { name: "status", label: "Status" },
      { name: "createdAt", label: "Received" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "position", label: "Position", type: "text" },
      { name: "rating", label: "Rating (out of 5)", type: "text" },
      { name: "comment", label: "Review", type: "textarea" },
    ],
  },
  applications: {
    label: "Applications",
    singular: "Application",
    primary: "name",
    readOnly: true,
    kind: "applications",
    columns: [
      { name: "name", label: "Applicant" },
      { name: "jobTitle", label: "Role" },
      { name: "email", label: "Email" },
      { name: "status", label: "Status" },
      { name: "createdAt", label: "Received" },
    ],
    fields: [
      { name: "name", label: "Full name", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "linkedin", label: "LinkedIn / Portfolio", type: "text" },
      { name: "jobTitle", label: "Applied for", type: "text" },
      { name: "message", label: "Message", type: "textarea" },
    ],
  },
};

export const settingsSchema = [
  {
    group: "Brand",
    fields: [
      { name: "site_name_en", label: "Website name (English)", type: "text" },
      { name: "site_name_ar", label: "Website name (Arabic)", type: "text" },
      { name: "name_en", label: "Company name (English)", type: "text" },
      { name: "name_ar", label: "Company name (Arabic)", type: "text" },
      { name: "tagline_en", label: "Tagline (English)", type: "text" },
      { name: "tagline_ar", label: "Tagline (Arabic)", type: "text" },
      { name: "hero_kicker_en", label: "Hero kicker (English)", type: "text" },
      { name: "hero_kicker_ar", label: "Hero kicker (Arabic)", type: "text" },
      { name: "intro_en", label: "Intro (English)", type: "textarea" },
      { name: "intro_ar", label: "Intro (Arabic)", type: "textarea" },
      { name: "founded_year", label: "Founded year", type: "text" },
    ],
  },
  {
    group: "Contact",
    fields: [
      { name: "email", label: "Email", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "city_en", label: "City (English)", type: "text" },
      { name: "city_ar", label: "City (Arabic)", type: "text" },
      { name: "address_en", label: "Address (English)", type: "text" },
      { name: "address_ar", label: "Address (Arabic)", type: "text" },
      { name: "maps_url", label: "Google Maps URL (optional)", type: "url" },
      { name: "hours_en", label: "Office hours (English)", type: "text" },
      { name: "hours_ar", label: "Office hours (Arabic)", type: "text" },
    ],
  },
  {
    group: "About Page",
    hint: "Content for the public About page (/about). Story falls back to the Intro, and the headline to the Tagline, when left blank.",
    fields: [
      { name: "about_headline_en", label: "Headline (English)", type: "text" },
      { name: "about_headline_ar", label: "Headline (Arabic)", type: "text" },
      { name: "about_en", label: "Story (English)", type: "textarea" },
      { name: "about_ar", label: "Story (Arabic)", type: "textarea" },
      { name: "mission_en", label: "Mission (English)", type: "textarea" },
      { name: "mission_ar", label: "Mission (Arabic)", type: "textarea" },
      { name: "vision_en", label: "Vision (English)", type: "textarea" },
      { name: "vision_ar", label: "Vision (Arabic)", type: "textarea" },
      { name: "about_image", label: "About image (max 1 MB)", type: "image", maxKB: 1024 },
    ],
  },
  {
    group: "Leadership Message",
    fields: [
      { name: "mgmt_quote_en", label: "Message (English)", type: "textarea" },
      { name: "mgmt_quote_ar", label: "Message (Arabic)", type: "textarea" },
      { name: "mgmt_name", label: "Name", type: "text" },
      { name: "mgmt_position_en", label: "Position (English)", type: "text" },
      { name: "mgmt_position_ar", label: "Position (Arabic)", type: "text" },
      { name: "mgmt_photo", label: "Photo (max 1 MB)", type: "image", maxKB: 1024 },
    ],
  },
  {
    group: "Social",
    fields: [
      { name: "linkedin", label: "LinkedIn URL", type: "url" },
      { name: "twitter", label: "X / Twitter URL", type: "url" },
      { name: "instagram", label: "Instagram URL", type: "url" },
    ],
  },
  {
    group: "Homepage highlights",
    hint: "The headline counters shown on the homepage (Years / Projects / Cities / Clients).",
    fields: [
      { name: "stat_years", label: "Years", type: "text" },
      { name: "stat_projects", label: "Projects", type: "text" },
      { name: "stat_cities", label: "Cities", type: "text" },
      { name: "stat_clients", label: "Clients", type: "text" },
    ],
  },
  // "Project Requirement Weights" moved to Projects → Settings (ProjectsSettings.js).
  // The underlying keys (req_delivery/req_installation/req_programming/req_handover)
  // are unchanged and still read by the completion model in lib/projectKpis.js.
  // The public site footer renders from the SAME keys shown in Brand / Contact /
  // Social above, so there is no separate "Footer" editor — editing those
  // containers updates the footer too.
];
