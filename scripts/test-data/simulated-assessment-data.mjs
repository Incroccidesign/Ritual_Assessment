export const TEST_PROFILES = [
  {
    organizationName: "TEST_Energia Tessile Sahel",
    respondentRole: "Responsabile produzione",
    compilationMode: "Una sola persona",
    organizationType: "Azienda di piccole dimensioni",
    organizationSize: "5-19 dipendenti",
    geography: "Sousse",
    mainActivityArea: "Tessitura",
    challengeThemes: ["energia", "macchinari", "consumi", "efficienza", "impianti"],
    shortObjective: "Ridurre i consumi energetici e stabilizzare i costi operativi nei prossimi 12 mesi.",
    mediumObjective: "Modernizzare progressivamente gli impianti produttivi con tecnologie piu efficienti.",
    needs: "Servono audit energetici, dati piu affidabili sui consumi, formazione tecnica e supporto per valutare investimenti sostenibili.",
    strengths: "L'organizzazione ha competenze produttive solide, relazioni locali stabili e capacita di sperimentare miglioramenti nei processi.",
    networkResources: "Puo condividere casi pratici su efficienza energetica, manutenzione dei macchinari e gestione dei consumi."
  },
  {
    organizationName: "TEST_Atelier Medina Durable",
    respondentRole: "Fondatore / fondatrice",
    compilationMode: "Piu persone della stessa area/reparto",
    organizationType: "Microazienda",
    organizationSize: "2-4 dipendenti",
    geography: "Tunis",
    mainActivityArea: "Confezione",
    challengeThemes: ["scarti", "materiali", "qualita", "circolare", "rifiuti"],
    shortObjective: "Ridurre gli scarti di lavorazione e migliorare la selezione dei materiali.",
    mediumObjective: "Costruire una filiera piu circolare con fornitori e partner locali.",
    needs: "Sono utili linee guida operative, contatti con riciclatori, formazione su materiali sostenibili e strumenti semplici di monitoraggio.",
    strengths: "L'atelier ha forte identita artigianale, qualita del prodotto e radicamento nel territorio.",
    networkResources: "Puo contribuire con know-how artigianale, pratiche di riuso creativo e relazioni con microimprese locali."
  },
  {
    organizationName: "TEST_Cooperativa Fili Futuri",
    respondentRole: "Responsabile sostenibilita",
    compilationMode: "Con il supporto di un consulente esterno",
    organizationType: "Cooperativa",
    organizationSize: "20-99 dipendenti",
    geography: "Monastir",
    mainActivityArea: "Filatura",
    challengeThemes: ["formazione", "competenze", "giovani", "lavoratori", "trasmissione"],
    shortObjective: "Rafforzare le competenze interne e documentare le pratiche di lavoro piu efficaci.",
    mediumObjective: "Creare un programma strutturato di formazione e passaggio di competenze.",
    needs: "Servono moduli formativi, tutor interni, strumenti per documentare processi e supporto per coinvolgere giovani lavoratori.",
    strengths: "La cooperativa dispone di esperienza produttiva, cultura collaborativa e una buona capacita di coinvolgere il personale.",
    networkResources: "Puo offrire esperienze su formazione, inclusione lavorativa e trasmissione delle competenze."
  },
  {
    organizationName: "TEST_Lab Innovazione Cotone",
    respondentRole: "Responsabile innovazione",
    compilationMode: "Piu persone di aree/reparti diversi",
    organizationType: "Start-up",
    organizationSize: "5-19 dipendenti",
    geography: "Sfax",
    mainActivityArea: "Ricerca",
    challengeThemes: ["digitale", "dati", "tracciabilita", "innovazione", "processi"],
    shortObjective: "Migliorare la raccolta dati e rendere piu chiari i flussi di tracciabilita.",
    mediumObjective: "Integrare strumenti digitali per monitorare qualita, sostenibilita e collaborazione di filiera.",
    needs: "Sono necessari supporto tecnico, strumenti digitali accessibili, competenze data-driven e confronto con altre organizzazioni.",
    strengths: "Il laboratorio ha capacita di innovazione, apertura alla sperimentazione e competenze tecniche trasversali.",
    networkResources: "Puo contribuire con strumenti digitali, casi pilota e metodi di raccolta dati per il network."
  },
  {
    organizationName: "TEST_Manufacture Oasis",
    respondentRole: "Direttore generale",
    compilationMode: "Una sola persona",
    organizationType: "Azienda di medie dimensioni",
    organizationSize: "20-99 dipendenti",
    geography: "Gabes",
    mainActivityArea: "Fissaggio",
    challengeThemes: ["acqua", "chimici", "sicurezza", "ambiente", "conformita"],
    shortObjective: "Ridurre gli impatti ambientali piu urgenti e migliorare la sicurezza dei processi.",
    mediumObjective: "Rafforzare la conformita ambientale e preparare investimenti per processi piu puliti.",
    needs: "Servono consulenza tecnica, formazione su sicurezza e sostanze, accesso a buone pratiche e supporto per pianificare investimenti.",
    strengths: "L'impresa ha capacita produttiva, esperienza tecnica e una posizione utile per generare impatto sul territorio.",
    networkResources: "Puo condividere esperienze su sicurezza, gestione ambientale e coordinamento tra produzione e direzione."
  }
];

export function parseArgs(argv) {
  return argv.reduce((args, item) => {
    if (!item.startsWith("--")) return args;
    const [key, ...valueParts] = item.slice(2).split("=");
    args[key] = valueParts.length ? valueParts.join("=") : "true";
    return args;
  }, {});
}

export function normalizeKey(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

export function isOrganizationNameField(field) {
  const aliases = [
    "organizationname",
    "organisationname",
    "companyname",
    "organization",
    "organisation",
    "company",
    "nomeorganizzazione",
    "nomedellorganizzazione",
    "nomeazienda",
    "nomdelorganisation",
    "companyname"
  ];
  return aliases.includes(normalizeKey(field.id)) || aliases.includes(normalizeKey(field.label));
}

export function optionMatching(options = [], candidates = []) {
  if (!options.length) return "";
  const normalizedCandidates = candidates.map(normalizeKey);
  return (
    options.find((option) => normalizedCandidates.some((candidate) => normalizeKey(option).includes(candidate) || candidate.includes(normalizeKey(option)))) ??
    options[0]
  );
}

export function makeBatchId() {
  return `batch_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

export function profileForIndex(index, batchId) {
  const base = TEST_PROFILES[index % TEST_PROFILES.length];
  const sequence = String(index + 1).padStart(3, "0");
  return {
    ...base,
    organizationName: `${base.organizationName}_${batchId}_${sequence}`,
    contactEmail: `test.${batchId}.${sequence}@example.test`,
    testBatchId: batchId,
    sequence
  };
}

export function buildAnswerForActivity(activity, profile, previousAnswers) {
  if (activity.type === "profiling") return buildProfilingAnswer(activity, profile);
  if (activity.type === "exploration") return buildExplorationAnswer(activity, profile);
  if (activity.type === "prioritization") return buildPrioritizationAnswer(activity, previousAnswers);
  if (activity.type === "framing") return buildFramingAnswer(activity, profile, previousAnswers);
  if (activity.type === "planning_report") return { viewedAt: new Date().toISOString() };
  return {};
}

function buildProfilingAnswer(activity, profile) {
  const fields = {};
  const otherText = {};

  for (const field of activity.fields ?? []) {
    const key = normalizeKey(`${field.id} ${field.label}`);
    if (isOrganizationNameField(field)) {
      fields[field.id] = profile.organizationName;
    } else if (key.includes("email")) {
      fields[field.id] = profile.contactEmail;
    } else if (key.includes("role") || key.includes("ruolo") || key.includes("repondant") || key.includes("respondent")) {
      fields[field.id] = selectFieldValue(field, profile.respondentRole);
    } else if (key.includes("compil")) {
      fields[field.id] = selectFieldValue(field, profile.compilationMode);
    } else if (key.includes("type") || key.includes("tipologia") || key.includes("organisation") || key.includes("organizzazione")) {
      fields[field.id] = selectFieldValue(field, profile.organizationType);
    } else if (key.includes("size") || key.includes("dimension") || key.includes("dipendenti")) {
      fields[field.id] = selectFieldValue(field, profile.organizationSize);
    } else if (key.includes("area") || key.includes("geograf") || key.includes("govern")) {
      fields[field.id] = selectFieldValue(field, profile.geography);
    } else if (key.includes("attivita") || key.includes("activity") || key.includes("secteur") || key.includes("settore")) {
      fields[field.id] = selectFieldValue(field, profile.mainActivityArea);
    } else {
      fields[field.id] = field.fieldType === "select" ? selectFieldValue(field, profile.mainActivityArea) : `${profile.organizationName} - ${field.label}`;
    }
  }

  return { fields, otherText };
}

function selectFieldValue(field, preferredValue) {
  if (field.fieldType !== "select" || !Array.isArray(field.options) || !field.options.length) return preferredValue;
  return optionMatching(field.options, [preferredValue, ...String(preferredValue).split(/\s+/)]);
}

function buildExplorationAnswer(activity, profile) {
  const maxSelections = activity.maxSelections || 3;
  const options = Array.isArray(activity.options) ? activity.options.filter(Boolean) : [];
  const selected = options
    .filter((option) => profile.challengeThemes.some((theme) => normalizeKey(option).includes(normalizeKey(theme))))
    .slice(0, maxSelections);
  const fallback = options.slice(0, Math.max(1, Math.min(maxSelections, 3)));
  const labels = (selected.length ? selected : fallback).slice(0, maxSelections);

  if (activity.responseMode === "free_input" || !labels.length) {
    const label = `${profile.shortObjective} [test_batch_id:${profile.testBatchId}]`;
    return { items: [{ id: `${activity.id}_test_custom_${profile.sequence}`, label, source: "custom" }] };
  }

  return {
    items: labels.map((label, index) => ({
      id: `${activity.id}_option_${index}`,
      label,
      source: "predefined",
      value: label
    }))
  };
}

function buildPrioritizationAnswer(activity, previousAnswers) {
  const sourceAnswer = previousAnswers.get(activity.sourceActivityId);
  const sourceItems = Array.isArray(sourceAnswer?.items) ? sourceAnswer.items : [];
  return {
    rankedItems: sourceItems.map((item, index) => ({
      sourceItemId: item.id,
      label: item.label,
      rank: index + 1
    }))
  };
}

function buildFramingAnswer(activity, profile, previousAnswers) {
  const sourceAnswer = previousAnswers.get(activity.sourceActivityId);
  const rankedItems = Array.isArray(sourceAnswer?.rankedItems) ? sourceAnswer.rankedItems : [];
  const sourceRanking = rankedItems.map((item) => item.label);
  const questions = Array.isArray(activity.questions) && activity.questions.length
    ? activity.questions
    : [{ id: `${activity.id}_answer`, title: activity.title, prompt: activity.prompt }];
  const questionAnswers = {};

  questions.forEach((question, index) => {
    questionAnswers[question.id] = framingTextForQuestion(question, index, profile, sourceRanking);
  });

  return {
    sourceRanking,
    questionAnswers,
    answer: questions.map((question) => `${question.title}\n${questionAnswers[question.id]}`).join("\n\n")
  };
}

function framingTextForQuestion(question, index, profile, sourceRanking) {
  const key = normalizeKey(`${question.title} ${question.prompt}`);
  const priorityText = sourceRanking.length ? ` Le priorita emerse sono: ${sourceRanking.slice(0, 3).join(", ")}.` : "";
  if (key.includes("support") || key.includes("bisogn") || key.includes("besoin")) return `${profile.needs}${priorityText} [test_batch_id:${profile.testBatchId}]`;
  if (key.includes("obiett") || key.includes("objectif") || key.includes("objective")) return `${index % 2 === 0 ? profile.shortObjective : profile.mediumObjective}${priorityText} [test_batch_id:${profile.testBatchId}]`;
  if (key.includes("risorse") || key.includes("resource") || key.includes("ressource")) return `${profile.networkResources} [test_batch_id:${profile.testBatchId}]`;
  if (key.includes("forza") || key.includes("valor") || key.includes("impact") || key.includes("strength")) return `${profile.strengths} [test_batch_id:${profile.testBatchId}]`;
  if (key.includes("passo") || key.includes("step")) return `Il primo passo realistico e raccogliere dati interni, assegnare un referente e avviare una sperimentazione breve. [test_batch_id:${profile.testBatchId}]`;
  return `${profile.needs}${priorityText} [test_batch_id:${profile.testBatchId}]`;
}
