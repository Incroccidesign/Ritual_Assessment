import type {
  ElementType,
  ExplorationOptionGroup,
  ExplorationResponseMode,
  PlanningReportSectionConfig,
  ProfilingField,
  ProfilingFieldType
} from "@/types/activity";
import type { Assessment } from "@/types/assessment";

type TemplateProfilingField = Omit<ProfilingField, "id">;

type BaseTemplateActivity = {
  key: string;
  title: string;
  prompt: string;
};

type TemplateProfilingActivity = BaseTemplateActivity & {
  type: "profiling";
  fields: TemplateProfilingField[];
};

type TemplateExplorationActivity = BaseTemplateActivity & {
  type: "exploration";
  itemType: ElementType;
  responseMode: ExplorationResponseMode;
  options: string[];
  optionGroups?: ExplorationOptionGroup[];
  optionGroupAssignments?: Record<string, string>;
  allowOther?: boolean;
  maxSelections?: number;
};

type TemplatePrioritizationActivity = BaseTemplateActivity & {
  type: "prioritization";
  sourceKey: string;
};

type TemplateFramingActivity = BaseTemplateActivity & {
  type: "framing";
  sourceKey?: string;
  maxLength: number;
  questions: Array<{
    title: string;
    prompt: string;
    placeholder?: string;
    required?: boolean;
  }>;
};

type TemplatePlanningReportActivity = BaseTemplateActivity & {
  type: "planning_report";
  reportTitle: string;
  reportSubtitle: string;
  sections: Array<Omit<PlanningReportSectionConfig, "items"> & {
    items?: Array<{
      sourceKey: string;
      title: string;
      visible: boolean;
    }>;
  }>;
};

export type AssessmentTemplateActivity =
  | TemplateProfilingActivity
  | TemplateExplorationActivity
  | TemplatePrioritizationActivity
  | TemplateFramingActivity
  | TemplatePlanningReportActivity;

export type AssessmentTemplate = {
  pickerTitle: string;
  pickerDescription: string;
  pickerBadge: string;
  title: string;
  description: string;
  estimatedDuration?: string;
  language: Assessment["language"];
  status: Assessment["status"];
  activities: AssessmentTemplateActivity[];
};

const nasijEstimatedDurations = {
  it: "Tempo stimato di compilazione: circa 35–45 minuti.",
  en: "Estimated completion time: around 35–45 minutes.",
  fr: "Temps estimé de réponse : environ 35–45 minutes."
};

const governorates = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "Kef",
  "Mahdia",
  "Manouba",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan"
];

const italianRespondentRoles = [
  "Artigiano",
  "Proprietario/a d'impresa",
  "Fondatore / fondatrice",
  "Direttore generale",
  "Responsabile delle operazioni",
  "Responsabile di produzione",
  "Responsabile qualità",
  "Responsabile tecnico",
  "Responsabile innovazione",
  "Responsabile sostenibilità",
  "Responsabile HR / formazione",
  "Product manager",
  "Sviluppatore prodotto",
  "Designer",
  "Modellista",
  "Operatore macchina / tecnico",
  "Responsabile commerciale",
  "Responsabile marketing / comunicazione",
  "Personale amministrativo",
  "Consulente esterno"
];

const frenchRespondentRoles = [
  "Artisan",
  "Propriétaire d'entreprise",
  "Fondateur / fondatrice",
  "Directeur général",
  "Responsable des opérations",
  "Responsable de production",
  "Responsable qualité",
  "Responsable technique",
  "Responsable innovation",
  "Responsable durabilité",
  "Responsable RH / formation",
  "Chef de produit",
  "Développeur produit",
  "Designer",
  "Modéliste",
  "Opérateur machine / technicien",
  "Responsable commercial",
  "Responsable marketing / communication",
  "Personnel administratif",
  "Consultant externe"
];

const italianOrganizationTypes = [
  "Cooperativa",
  "Associazione",
  "Impresa individuale — 1 dipendenti",
  "Microazienda — 2-4 dipendenti",
  "Azienda di piccole dimensioni — 5-19 dipendenti",
  "Azienda di medie dimensioni — 20-99 dipendenti",
  "Azienda di grandi dimensioni — 100 o più dipendenti",
  "Start-up"
];

const frenchOrganizationTypes = [
  "Coopérative",
  "Association",
  "Entreprise individuelle — 1 employé",
  "Microentreprise — 2-4 employés",
  "Petite entreprise — 5-19 employés",
  "Entreprise moyenne — 20-99 employés",
  "Grande entreprise — 100 employés ou plus",
  "Start-up"
];

const italianOrganizationSizes = [
  "1-4 persone",
  "5-19 persone",
  "20-99 persone",
  "100 o più persone",
  "Non so / preferisco non rispondere"
];

const frenchOrganizationSizes = [
  "1-4 personnes",
  "5-19 personnes",
  "20-99 personnes",
  "100 personnes ou plus",
  "Je ne sais pas / préfère ne pas répondre"
];

const activityAreasIt = [
  "Tessitura",
  "Filatura",
  "Tintura",
  "Finissaggio",
  "Confezione",
  "Maglieria",
  "Distribuzione / commercio",
  "Formazione",
  "Ricerca",
  "Supporto tecnico / consulenza"
];

const activityAreasFr = [
  "Tissage",
  "Filature",
  "Teinture",
  "Finition",
  "Confection",
  "Tricotage",
  "Distribution / commerce",
  "Formation",
  "Recherche",
  "Soutien technique / conseil"
];

const currentDifficultiesIt = [
  "Consumi energetici elevati nei processi produttivi",
  "Consumi idrici elevati",
  "Difficoltà nella gestione degli scarti tessili",
  "Sprechi, rilavorazioni o difetti di produzione",
  "Costi produttivi difficili da controllare",
  "Mancanza di dati su consumi, costi, scarti, sicurezza o impatti",
  "Organizzazione interna dei processi poco efficiente",
  "Macchinari, impianti o tecnologie non adeguati",
  "Difficoltà nel garantire sicurezza e condizioni di lavoro adeguate",
  "Carichi di lavoro, fatica fisica o rischi operativi elevati",
  "Bisogno di formazione tecnica del personale",
  "Bisogno di formazione su sicurezza, qualità o sostenibilità",
  "Difficoltà nel trattenere o attrarre lavoratori qualificati",
  "Comunicazione interna poco efficace tra ruoli, reparti o livelli decisionali",
  "Difficoltà nel rispondere a richieste di sostenibilità da parte di clienti o mercati",
  "Difficoltà nel prepararsi a standard, certificazioni o audit ambientali e sociali",
  "Difficoltà nel valorizzare pratiche sostenibili già esistenti"
];

const currentDifficultiesFr = [
  "Consommations énergétiques élevées dans les processus de production",
  "Consommations d'eau élevées",
  "Difficultés dans la gestion des déchets textiles",
  "Gaspillages, reprises ou défauts de production",
  "Coûts de production difficiles à contrôler",
  "Manque de données sur les consommations, les coûts, les déchets, la sécurité ou les impacts",
  "Organisation interne des processus peu efficace",
  "Machines, installations ou technologies inadéquates",
  "Difficultés à garantir la sécurité et des conditions de travail adéquates",
  "Charges de travail, fatigue physique ou risques opérationnels élevés",
  "Besoin de formation technique du personnel",
  "Besoin de formation sur la sécurité, la qualité ou la durabilité",
  "Difficultés à retenir ou attirer des travailleurs qualifiés",
  "Communication interne peu efficace entre rôles, départements ou niveaux décisionnels",
  "Difficultés à répondre aux demandes de durabilité des clients ou des marchés",
  "Difficultés à se préparer aux standards, certifications ou audits environnementaux et sociaux",
  "Difficultés à valoriser les pratiques durables déjà existantes"
];

const urgentAreasIt = [
  "Produzione",
  "Qualità",
  "Manutenzione",
  "Logistica / magazzino",
  "Acquisti / fornitori",
  "Commerciale / clienti",
  "Amministrazione / gestione",
  "Risorse umane / formazione",
  "Direzione / management",
  "Tutta l'organizzazione"
];

const urgentAreasFr = [
  "Production",
  "Qualité",
  "Maintenance",
  "Logistique / entrepôt",
  "Achats / fournisseurs",
  "Commercial / clients",
  "Administration / gestion",
  "Ressources humaines / formation",
  "Direction / management",
  "Toute l'organisation"
];

const impactedProfilesIt = [
  "Proprietà / direzione",
  "Responsabili di produzione o tecnici",
  "Responsabili qualità o sostenibilità",
  "Responsabili HR / formazione",
  "Operatori e operatrici di produzione",
  "Tecnici di macchina / manutenzione",
  "Personale commerciale o amministrativo",
  "Consulenti o partner esterni",
  "Tutta l'organizzazione"
];

const impactedProfilesFr = [
  "Propriété / direction",
  "Responsables de production ou techniques",
  "Responsables qualité ou durabilité",
  "Responsables RH / formation",
  "Opérateurs et opératrices de production",
  "Techniciens machine / maintenance",
  "Personnel commercial ou administratif",
  "Consultants ou partenaires externes",
  "Toute l'organisation"
];

const effectsIt = [
  "Aumento dei costi",
  "Riduzione della produttività",
  "Ritardi nelle consegne",
  "Problemi di qualità",
  "Aumento di sprechi, scarti o rilavorazioni",
  "Aumento di consumi o impatti ambientali",
  "Rischi per sicurezza o salute",
  "Peggioramento delle condizioni di lavoro",
  "Difficoltà nel motivare, formare o trattenere il personale",
  "Difficoltà con clienti, mercati o certificazioni"
];

const effectsFr = [
  "Augmentation des coûts",
  "Réduction de la productivité",
  "Retards de livraison",
  "Problèmes de qualité",
  "Augmentation des gaspillages, déchets ou reprises",
  "Augmentation des consommations ou impacts environnementaux",
  "Risques pour la sécurité ou la santé",
  "Dégradation des conditions de travail",
  "Difficultés à motiver, former ou retenir le personnel",
  "Difficultés avec les clients, les marchés ou les certifications"
];

const shortChallengesIt = [
  "Ridurre i consumi energetici nei processi produttivi",
  "Ridurre i consumi idrici nei processi produttivi",
  "Migliorare la gestione degli scarti tessili",
  "Valorizzare gli scarti di produzione",
  "Ridurre sprechi, rilavorazioni e difetti di produzione",
  "Migliorare la qualità dei prodotti o dei processi",
  "Raccogliere dati su consumi, costi, scarti, sicurezza e impatti",
  "Migliorare l'organizzazione interna dei processi",
  "Migliorare la sicurezza nei reparti produttivi",
  "Migliorare le condizioni quotidiane di lavoro",
  "Ridurre rischi, fatica fisica o carichi di lavoro critici",
  "Rafforzare la formazione tecnica del personale",
  "Formare il personale su sicurezza, qualità e sostenibilità",
  "Migliorare la comunicazione interna tra direzione, tecnici e operatori",
  "Individuare materiali o fornitori più sostenibili",
  "Rispondere alle richieste di sostenibilità dei clienti",
  "Prepararsi a standard, certificazioni o audit ambientali e sociali",
  "Comunicare meglio le pratiche sostenibili già esistenti",
  "Migliorare la tracciabilità dei prodotti o dei processi"
];

const shortChallengesFr = [
  "Réduire les consommations énergétiques dans les processus de production",
  "Réduire les consommations d'eau dans les processus de production",
  "Améliorer la gestion des déchets textiles",
  "Valoriser les déchets de production",
  "Réduire les gaspillages, reprises et défauts de production",
  "Améliorer la qualité des produits ou des processus",
  "Collecter des données sur les consommations, les coûts, les déchets, la sécurité et les impacts",
  "Améliorer l'organisation interne des processus",
  "Améliorer la sécurité dans les départements de production",
  "Améliorer les conditions quotidiennes de travail",
  "Réduire les risques, la fatigue physique ou les charges de travail critiques",
  "Renforcer la formation technique du personnel",
  "Former le personnel à la sécurité, à la qualité et à la durabilité",
  "Améliorer la communication interne entre direction, techniciens et opérateurs",
  "Identifier des matériaux ou fournisseurs plus durables",
  "Répondre aux demandes de durabilité des clients",
  "Se préparer aux standards, certifications ou audits environnementaux et sociaux",
  "Mieux communiquer les pratiques durables déjà existantes",
  "Améliorer la traçabilité des produits ou des processus"
];

const strategicChallengesIt = [
  "Modernizzare impianti, macchinari o tecnologie riducendo consumi, rischi e impatti ambientali",
  "Integrare soluzioni di efficienza energetica nei processi produttivi",
  "Adottare energie rinnovabili quando possibile",
  "Ridurre l'impronta ambientale dei prodotti e dei processi",
  "Integrare pratiche di economia circolare",
  "Creare sistemi di riutilizzo, riciclo o valorizzazione degli scarti tessili",
  "Innovare prodotti, processi o modelli economici in ottica sostenibile",
  "Sviluppare prodotti a maggiore valore aggiunto e minore impatto ambientale",
  "Digitalizzare i processi produttivi e gestionali per migliorare efficienza, tracciabilità e qualità del lavoro",
  "Sviluppare sistemi di tracciabilità digitale dei prodotti, dei processi e delle condizioni di produzione",
  "Rafforzare competenze tecniche e manageriali per migliorare sostenibilità, qualità del lavoro e impatto ambientale",
  "Attrarre, formare e trattenere giovani lavoratori qualificati",
  "Creare percorsi di sviluppo professionale e trasmissione del saper fare interno",
  "Rafforzare politiche e pratiche di lavoro dignitoso",
  "Sviluppare forme di benessere al lavoro coerenti con il contesto locale",
  "Migliorare inclusione, equità e partecipazione dei lavoratori",
  "Adattarsi alle esigenze ambientali e sociali dei mercati europei",
  "Collaborare con altre imprese del network su formazione, innovazione, sostenibilità o accesso ai mercati",
  "Valorizzare il sapere locale e le competenze artigianali del territorio"
];

const strategicChallengesFr = [
  "Moderniser les installations, les machines ou les technologies en réduisant les consommations, les risques et les impacts environnementaux",
  "Intégrer des solutions d'efficacité énergétique dans les processus de production",
  "Adopter des énergies renouvelables lorsque cela est possible",
  "Réduire l'empreinte environnementale des produits et des processus",
  "Intégrer des pratiques d'économie circulaire",
  "Créer des systèmes de réutilisation, de recyclage ou de valorisation des déchets textiles",
  "Innover les produits, les processus ou les modèles économiques dans une perspective durable",
  "Développer des produits à plus forte valeur ajoutée et à plus faible impact environnemental",
  "Digitaliser les processus de production et de gestion pour améliorer l'efficacité, la traçabilité et la qualité du travail",
  "Développer des systèmes de traçabilité numérique des produits, des processus et des conditions de production",
  "Renforcer les compétences techniques et managériales pour améliorer la durabilité, la qualité du travail et l'impact environnemental",
  "Attirer, former et retenir de jeunes travailleurs qualifiés",
  "Créer des parcours de développement professionnel et de transmission du savoir-faire interne",
  "Renforcer les politiques et pratiques de travail décent",
  "Développer des formes de bien-être au travail cohérentes avec le contexte local",
  "Améliorer l'inclusion, l'équité et la participation des travailleurs",
  "S'adapter aux exigences environnementales et sociales des marchés européens",
  "Collaborer avec d'autres entreprises du réseau sur la formation, l'innovation, la durabilité ou l'accès aux marchés",
  "Valoriser le savoir-faire local et les compétences artisanales du territoire"
];

function profilingField(
  label: string,
  fieldType: ProfilingFieldType,
  options?: string[],
  allowOther = false
): TemplateProfilingField {
  return {
    label,
    fieldType,
    required: true,
    allowOther,
    ...(options ? { options } : {})
  };
}

function exploration(
  key: string,
  title: string,
  prompt: string,
  options: string[],
  allowOther = true,
  maxSelections?: number,
  optionGroups?: ExplorationOptionGroup[],
  optionGroupAssignments?: Record<string, string>
): TemplateExplorationActivity {
  return {
    key,
    type: "exploration",
    title,
    prompt,
    itemType: "criticalities",
    responseMode: "open_list",
    allowOther,
    maxSelections,
    options,
    ...(optionGroups ? { optionGroups } : {}),
    ...(optionGroupAssignments ? { optionGroupAssignments } : {})
  };
}

function groupedChallengeOptions(
  socialOptions: string[],
  environmentalOptions: string[],
  socialLabel: string,
  environmentalLabel: string
) {
  const optionGroups = [
    { id: "social-personnel", label: socialLabel, orderIndex: 0 },
    { id: "environmental-processes", label: environmentalLabel, orderIndex: 1 }
  ];
  const options = [...socialOptions, ...environmentalOptions];
  const optionGroupAssignments: Record<string, string> = {};
  socialOptions.forEach((_, index) => {
    optionGroupAssignments[String(index)] = optionGroups[0].id;
  });
  environmentalOptions.forEach((_, index) => {
    optionGroupAssignments[String(socialOptions.length + index)] = optionGroups[1].id;
  });

  return { options, optionGroups, optionGroupAssignments };
}

const shortChallengeGroupsIt = groupedChallengeOptions(
  [
    "Migliorare la regolarità e la stabilità dei rapporti di lavoro",
    "Garantire retribuzioni eque e pagamenti regolari",
    "Migliorare l'organizzazione degli orari e la conciliazione tra lavoro e vita familiare",
    "Formare il personale su competenze tecniche specifiche",
    "Formare il personale su sostenibilità, qualità o innovazione",
    "Migliorare la sicurezza e le condizioni di lavoro"
  ],
  [
    "Ridurre i consumi energetici nei processi produttivi",
    "Ridurre i consumi idrici",
    "Migliorare la gestione degli scarti tessili",
    "Valorizzare gli scarti di produzione",
    "Ridurre sprechi, rilavorazioni e difetti di produzione",
    "Raccogliere dati su consumi, costi, scarti e impatti",
    "Migliorare l'organizzazione interna dei processi",
    "Individuare materiali o fornitori più sostenibili",
    "Rispondere alle richieste di sostenibilità dei clienti",
    "Prepararsi a standard, certificazioni o audit",
    "Comunicare meglio le pratiche sostenibili già esistenti",
    "Migliorare la tracciabilità dei prodotti o dei processi"
  ],
  "Ambito sociale e del personale",
  "Ambito ambientale e dei processi"
);

const shortChallengeGroupsFr = groupedChallengeOptions(
  [
    "Améliorer la régularité et la stabilité des relations de travail",
    "Garantir des rémunérations équitables et des paiements réguliers",
    "Améliorer l'organisation des horaires et l'équilibre entre travail et vie familiale",
    "Former le personnel à des compétences techniques spécifiques",
    "Former le personnel à la durabilité, à la qualité ou à l'innovation",
    "Améliorer la sécurité et les conditions de travail"
  ],
  [
    "Réduire les consommations énergétiques dans les processus de production",
    "Réduire les consommations d'eau",
    "Améliorer la gestion des déchets textiles",
    "Valoriser les déchets de production",
    "Réduire les gaspillages, reprises et défauts de production",
    "Collecter des données sur les consommations, les coûts, les déchets et les impacts",
    "Améliorer l'organisation interne des processus",
    "Identifier des matériaux ou fournisseurs plus durables",
    "Répondre aux demandes de durabilité des clients",
    "Se préparer aux standards, certifications ou audits",
    "Mieux communiquer les pratiques durables déjà existantes",
    "Améliorer la traçabilité des produits ou des processus"
  ],
  "Domaine social et du personnel",
  "Domaine environnemental et des processus"
);

const strategicChallengeGroupsIt = groupedChallengeOptions(
  [
    "Creare e consolidare occupazione stabile, regolare e dignitosa",
    "Sviluppare politiche aziendali per la parità di genere e l'accesso delle donne ai ruoli decisionali",
    "Costruire percorsi di carriera, qualificazione e aggiornamento continuo delle lavoratrici e dei lavoratori",
    "Rafforzare sistemi permanenti di salute, sicurezza e prevenzione dei rischi professionali",
    "Rafforzare le competenze tecniche e manageriali interne",
    "Attrarre e formare giovani lavoratori qualificati"
  ],
  [
    "Modernizzare impianti, macchinari o tecnologie produttive",
    "Integrare soluzioni di efficienza energetica",
    "Adottare energie rinnovabili dove possibile",
    "Sviluppare prodotti a maggiore valore aggiunto",
    "Innovare prodotti, processi o modelli di business",
    "Integrare pratiche di economia circolare",
    "Creare sistemi per riuso, riciclo o valorizzazione degli scarti tessili",
    "Ridurre l'impronta ambientale dei prodotti o dei processi",
    "Trasmettere e valorizzare il know-how locale",
    "Digitalizzare i processi produttivi e gestionali",
    "Sviluppare sistemi di tracciabilità digitale",
    "Collaborare con altre aziende del network",
    "Adeguarsi ai requisiti ambientali e sociali dei mercati europei"
  ],
  "Ambito sociale e del personale",
  "Ambito ambientale e dei processi"
);

const strategicChallengeGroupsFr = groupedChallengeOptions(
  [
    "Créer et consolider un emploi stable, régulier et digne",
    "Développer des politiques d'entreprise pour l'égalité de genre et l'accès des femmes aux rôles décisionnels",
    "Construire des parcours de carrière, de qualification et de mise à jour continue des travailleuses et des travailleurs",
    "Renforcer des systèmes permanents de santé, de sécurité et de prévention des risques professionnels",
    "Renforcer les compétences techniques et managériales internes",
    "Attirer et former de jeunes travailleurs qualifiés"
  ],
  [
    "Moderniser les installations, les machines ou les technologies de production",
    "Intégrer des solutions d'efficacité énergétique",
    "Adopter des énergies renouvelables lorsque cela est possible",
    "Développer des produits à plus forte valeur ajoutée",
    "Innover les produits, les processus ou les modèles d'affaires",
    "Intégrer des pratiques d'économie circulaire",
    "Créer des systèmes de réutilisation, de recyclage ou de valorisation des déchets textiles",
    "Réduire l'empreinte environnementale des produits ou des processus",
    "Transmettre et valoriser le savoir-faire local",
    "Digitaliser les processus de production et de gestion",
    "Développer des systèmes de traçabilité numérique",
    "Collaborer avec d'autres entreprises du réseau",
    "S'adapter aux exigences environnementales et sociales des marchés européens"
  ],
  "Domaine social et du personnel",
  "Domaine environnemental et des processus"
);

function prioritization(key: string, title: string, prompt: string, sourceKey: string): TemplatePrioritizationActivity {
  return {
    key,
    type: "prioritization",
    title,
    prompt,
    sourceKey
  };
}

function framing(
  key: string,
  title: string,
  prompt: string,
  sourceKey: string | undefined,
  questions: TemplateFramingActivity["questions"]
): TemplateFramingActivity {
  return {
    key,
    type: "framing",
    title,
    prompt,
    sourceKey,
    maxLength: 2500,
    questions
  };
}

function planningReport(locale: "it" | "fr"): TemplatePlanningReportActivity {
  const isItalian = locale === "it";
  const item = (sourceKey: string, title: string) => ({ sourceKey, title, visible: true });
  return {
    key: "planning-report",
    type: "planning_report",
    title: isItalian ? "Restituzione e report finale" : "Restitution et rapport final",
    prompt: isItalian
      ? "Rivedi la sintesi delle tue risposte e scarica il report finale dell'assessment NASIJ."
      : "Consultez la synthèse de vos réponses et téléchargez le rapport final de l'assessment NASIJ.",
    reportTitle: isItalian ? "Report assessment NASIJ" : "Rapport d'assessment NASIJ",
    reportSubtitle: isItalian
      ? "Sintesi strutturata delle risposte, delle priorità, dei punti di forza e dei contributi emersi durante l'assessment."
      : "Synthèse structurée des réponses, des priorités, des points forts et des contributions issues de l'assessment.",
    sections: [
      {
        key: "profile",
        title: isItalian ? "Profilo organizzazione" : "Profil de l'organisation",
        visible: true,
        items: [item("profiling", isItalian ? "Profilazione" : "Profilage")]
      },
      {
        key: "current-context",
        title: isItalian ? "Criticità attuali e contesto operativo" : "Difficultés actuelles et contexte opérationnel",
        visible: true,
        items: [
          item("current-difficulties", isItalian ? "Criticità principali" : "Difficultés principales"),
          item("urgent-difficulty", isItalian ? "Criticità più urgente" : "Difficulté la plus urgente"),
          item("urgent-area", isItalian ? "Area principale" : "Zone principale"),
          item("impacted-profiles", isItalian ? "Profili coinvolti o impattati" : "Profils impliqués ou impactés"),
          item("urgent-effects", isItalian ? "Effetti della criticità" : "Effets de la difficulté"),
          item("urgent-note", isItalian ? "Nota aperta" : "Note ouverte")
        ]
      },
      {
        key: "short-term",
        title: isItalian ? "Breve termine" : "Court terme",
        visible: true,
        items: [
          item("short-objective", isItalian ? "Obiettivo principale a breve termine" : "Objectif principal à court terme"),
          item("short-challenges", isItalian ? "Challenge operative" : "Défis opérationnels"),
          item("short-priorities", isItalian ? "Priorità a breve termine" : "Priorités à court terme"),
          item("short-needs-framing", isItalian ? "Framing dei bisogni a breve termine" : "Cadrage des besoins à court terme")
        ]
      },
      {
        key: "medium-long-term",
        title: isItalian ? "Medio-lungo termine" : "Moyen-long terme",
        visible: true,
        items: [
          item("medium-objective", isItalian ? "Obiettivo principale a medio-lungo termine" : "Objectif principal à moyen-long terme")
        ]
      },
      {
        key: "strengths-impact",
        title: isItalian ? "Punti di forza e impatto sul territorio" : "Points forts et impact sur le territoire",
        visible: true,
        items: [
          item("elements-to-value", isItalian ? "Punti di forza e impatto sul territorio" : "Points forts et impact sur le territoire")
        ]
      },
      {
        key: "network-contribution",
        title: isItalian ? "Risorse e contributi per il network NASIJ" : "Ressources et contributions pour le réseau NASIJ",
        visible: true,
        items: [
          item("network-resources", isItalian ? "Risorse e contributi per il network NASIJ" : "Ressources et contributions pour le réseau NASIJ")
        ]
      }
    ]
  };
}

function buildItalianTemplate(): AssessmentTemplate {
  return {
    pickerTitle: "NASIJ — Assessment sostenibilità",
    pickerDescription:
      "Valutazione degli obiettivi, delle criticità, delle challenge operative e delle opportunità di collaborazione per il network NASIJ.",
    pickerBadge: "IT",
    title: "Valutazione degli obiettivi, delle criticità, delle sfide e delle opportunità di collaborazione NASIJ",
    description:
      "Questa valutazione aiuta a identificare le criticità attuali, gli obiettivi principali di sostenibilità ambientale, economica e sociale dei partner NASIJ nel breve e medio-lungo termine. Il template collega l'obiettivo a breve termine alle challenge operative e alle priorità; raccoglie inoltre i punti di forza dell'organizzazione, il possibile impatto positivo sul territorio, l'obiettivo principale a medio-lungo termine e le risorse o contributi che l'organizzazione può mettere a disposizione del network.",
    estimatedDuration: nasijEstimatedDurations.it,
    language: "it",
    status: "draft",
    activities: [
      {
        key: "profiling",
        type: "profiling",
        title: "1. Profilazione",
        prompt:
          "Questa sezione raccoglie informazioni di base sul rispondente e sulla sua organizzazione. Il questionario dovrebbe essere compilato preferibilmente da una persona con una visione complessiva dell'organizzazione, dei processi produttivi, delle condizioni di lavoro e delle priorità di sviluppo.",
        fields: [
          profilingField("Nome dell'organizzazione", "text"),
          profilingField("Area geografica / Governatorato", "select", governorates),
          profilingField("Ruolo del rispondente", "select", italianRespondentRoles, true),
          profilingField("Modalità di compilazione", "select", [
            "Una sola persona",
            "Più persone della stessa area/reparto",
            "Più persone di aree/reparti diversi",
            "Con il supporto di un consulente esterno"
          ], true),
          profilingField("Tipo di organizzazione", "select", italianOrganizationTypes),
          profilingField("Ambito principale di attività", "select", activityAreasIt, true)
        ]
      },
      exploration(
        "current-difficulties",
        "2. Criticità attuali e contesto operativo",
        "2.1 Quali sono le principali difficoltà che la vostra organizzazione sta affrontando attualmente? Selezionare una o più criticità rilevanti. Se necessario, aggiungere una criticità specifica non presente nell'elenco.",
        currentDifficultiesIt
      ),
      prioritization(
        "urgent-difficulty",
        "2.2 Criticità più urgente",
        "Tra le criticità indicate, quale dovrebbe essere affrontata con maggiore urgenza? Ordinare mettendo in alto la criticità prioritaria.",
        "current-difficulties"
      ),
      exploration(
        "urgent-area",
        "2.3 Area principale della criticità più urgente",
        "In quale area si manifesta principalmente questa criticità urgente? Selezionare l'area in cui la criticità urgente è più evidente o produce gli effetti principali.",
        urgentAreasIt,
        true,
        1
      ),
      exploration(
        "impacted-profiles",
        "2.4 Profili coinvolti o impattati",
        "Quali profili sono maggiormente coinvolti o impattati dalla criticità più urgente? Selezionare uno o più profili coinvolti o direttamente impattati.",
        impactedProfilesIt
      ),
      exploration(
        "urgent-effects",
        "2.5 Effetti della criticità più urgente",
        "Quali effetti produce questa criticità sulla vostra organizzazione? Selezionare gli effetti più rilevanti.",
        effectsIt
      ),
      framing(
        "urgent-note",
        "2.6 Nota aperta sulla criticità",
        "Campo facoltativo. È possibile lasciare la risposta vuota.",
        "urgent-difficulty",
        [
          {
            title: "Nota aperta sulla criticità",
            prompt:
              "Volete aggiungere informazioni utili per comprendere meglio questa criticità? Potete descrivere da quanto tempo è presente, perché è diventata rilevante, quali ostacoli impediscono di affrontarla o quali tentativi sono già stati fatti.",
            required: false
          }
        ]
      ),
      framing(
        "short-objective",
        "3. Obiettivo principale a breve termine",
        "Identificare un obiettivo principale che l'organizzazione intende raggiungere nei prossimi 6-12 mesi.",
        "urgent-difficulty",
        [
          {
            title: "Obiettivo principale",
            prompt:
              "Pensate ai prossimi 6-12 mesi. Qual è l'obiettivo principale di sostenibilità, miglioramento o sviluppo che la vostra organizzazione vorrebbe raggiungere? Indicare un solo obiettivo principale."
          }
        ]
      ),
      exploration(
        "short-challenges",
        "4. Challenge e priorità a breve termine",
        "4.1 Su quali challenge operative dovrebbe lavorare la vostra organizzazione per raggiungere l'obiettivo a breve termine indicato? Selezionare una o più challenge operative rilevanti, almeno una per ogni ambito (sociale e ambientale). Se necessario, aggiungere una challenge specifica non presente nell'elenco.",
        shortChallengeGroupsIt.options,
        true,
        undefined,
        shortChallengeGroupsIt.optionGroups,
        shortChallengeGroupsIt.optionGroupAssignments
      ),
      prioritization(
        "short-priorities",
        "4.2 Priorità a breve termine",
        "Ordinare le challenge selezionate dalla priorità più alta alla priorità più bassa, considerando urgenza, fattibilità e impatto su produzione, ambiente, sicurezza e condizioni di lavoro.",
        "short-challenges"
      ),
      framing(
        "short-needs-framing",
        "5. Framing dei bisogni a breve termine",
        "Questa sezione serve a trasformare l'obiettivo e le challenge a breve termine in bisogni operativi, azioni possibili e forme di supporto.",
        "short-priorities",
        [
          {
            title: "Supporto immediato",
            prompt:
              "Quale tipo di supporto aiuterebbe la vostra organizzazione a raggiungere l'obiettivo a breve termine e ad affrontare le challenge più urgenti?"
          },
          {
            title: "Risorse pratiche",
            prompt: "Quali strumenti, conoscenze, formazioni o supporto tecnico sarebbero utili nei prossimi 6-12 mesi?"
          },
          {
            title: "Primo passo",
            prompt: "Quale potrebbe essere un primo passo realistico per iniziare a lavorare su questo obiettivo?"
          }
        ]
      ),
      framing(
        "medium-objective",
        "6. Obiettivo principale a medio-lungo termine",
        "Identificare un obiettivo principale che l'organizzazione intende raggiungere o preparare nei prossimi 1-5 anni o più.",
        undefined,
        [
          {
            title: "Obiettivo principale",
            prompt:
              "Pensate ai prossimi 1-5 anni o più. Qual è l'obiettivo principale di sostenibilità, miglioramento, sviluppo o trasformazione che potrebbe diventare più rilevante per la vostra organizzazione, il vostro settore o il vostro territorio?"
          }
        ]
      ),
      framing(
        "elements-to-value",
        "7. Punti di forza e impatto sul territorio",
        "Questa sezione serve a identificare i principali punti di forza dell'organizzazione, gli aspetti da valorizzare e il contributo positivo che può generare sul territorio, sulla comunità locale e sul network NASIJ.",
        undefined,
        [
          {
            title: "Punti di forza e impatto sul territorio",
            prompt:
              "Quali sono i principali punti di forza della vostra azienda, organizzazione o attività? Quali elementi pensate debbano essere riconosciuti, rafforzati o comunicati meglio? Che tipo di impatto positivo pensate di poter generare sul territorio o sulla comunità locale?",
            placeholder:
              "Potete fare riferimento, ad esempio, a competenze artigianali, know-how tecnico, qualità dei prodotti, capacità produttiva, radicamento territoriale, relazioni locali, pratiche sostenibili già esistenti, cultura del lavoro, innovazione, identità aziendale, potenziale di collaborazione, opportunità occupazionali, trasmissione di competenze, inclusione sociale o contributo allo sviluppo della comunità locale."
          }
        ]
      ),
      framing(
        "network-resources",
        "8. Risorse e contributi per il network NASIJ",
        "Questa sezione serve a identificare cosa ogni organizzazione potrebbe condividere o mettere a disposizione delle altre realtà del network NASIJ, indipendentemente dagli obiettivi o dalle challenge indicate nelle sezioni precedenti.",
        undefined,
        [
          {
            title: "Risorse e contributi",
            prompt:
              "Quali risorse, competenze, esperienze, strumenti, conoscenze, spazi, servizi o opportunità la vostra organizzazione potrebbe mettere a disposizione delle altre aziende o dei soggetti del network NASIJ?",
            placeholder:
              "Potete indicare, ad esempio, competenze tecniche, esperienze produttive, conoscenze locali, capacità formative, disponibilità a collaborare, accesso a macchinari, spazi, contatti, buone pratiche, casi studio o altre risorse utili."
          }
        ]
      ),
      planningReport("it")
    ]
  };
}

function buildFrenchTemplate(): AssessmentTemplate {
  return {
    pickerTitle: "NASIJ — Assessment durabilité",
    pickerDescription:
      "Évaluation des objectifs, des difficultés, des défis opérationnels et des opportunités de collaboration pour le réseau NASIJ.",
    pickerBadge: "FR",
    title: "Évaluation des objectifs, des difficultés, des défis et des opportunités de collaboration NASIJ",
    description:
      "Cette évaluation aide à identifier les difficultés actuelles, les principaux objectifs de durabilité environnementale, économique et sociale des partenaires NASIJ à court et moyen-long terme. Le modèle relie l'objectif à court terme aux défis opérationnels et aux priorités ; il recueille également les points forts de l'organisation, son impact positif possible sur le territoire, l'objectif principal à moyen-long terme et les ressources ou contributions que l'organisation peut mettre à disposition du réseau.",
    estimatedDuration: nasijEstimatedDurations.fr,
    language: "fr",
    status: "draft",
    activities: [
      {
        key: "profiling",
        type: "profiling",
        title: "1. Profilage",
        prompt:
          "Cette section recueille des informations de base sur le répondant et son organisation. Le questionnaire devrait être rempli de préférence par une personne ayant une vision globale de l'organisation, des processus de production, des conditions de travail et des priorités de développement.",
        fields: [
          profilingField("Nom de l'organisation", "text"),
          profilingField("Zone géographique / Gouvernorat", "select", governorates),
          profilingField("Rôle du répondant", "select", frenchRespondentRoles, true),
          profilingField("Mode de remplissage", "select", [
            "Une seule personne",
            "Plusieurs personnes du même service",
            "Plusieurs personnes de services différents",
            "Avec le soutien d'un consultant externe"
          ], true),
          profilingField("Type d'organisation", "select", frenchOrganizationTypes),
          profilingField("Domaine principal d'activité", "select", activityAreasFr, true)
        ]
      },
      exploration(
        "current-difficulties",
        "2. Difficultés actuelles et contexte opérationnel",
        "2.1 Quelles sont les principales difficultés que votre organisation rencontre actuellement ? Sélectionner une ou plusieurs difficultés pertinentes. Si nécessaire, ajouter une difficulté spécifique qui n'est pas présente dans la liste.",
        currentDifficultiesFr
      ),
      prioritization(
        "urgent-difficulty",
        "2.2 Difficulté la plus urgente",
        "Parmi les difficultés indiquées, laquelle devrait être traitée avec le plus d'urgence ? Classer en plaçant en haut la difficulté prioritaire.",
        "current-difficulties"
      ),
      exploration(
        "urgent-area",
        "2.3 Zone principale de la difficulté la plus urgente",
        "Dans quelle zone cette difficulté urgente se manifeste-t-elle principalement ? Sélectionner la zone où la difficulté urgente est la plus visible ou produit les effets principaux.",
        urgentAreasFr,
        true,
        1
      ),
      exploration(
        "impacted-profiles",
        "2.4 Profils impliqués ou impactés",
        "Quels profils sont les plus impliqués ou impactés par la difficulté la plus urgente ? Sélectionner un ou plusieurs profils impliqués ou directement impactés.",
        impactedProfilesFr
      ),
      exploration(
        "urgent-effects",
        "2.5 Effets de la difficulté la plus urgente",
        "Quels effets cette difficulté produit-elle sur votre organisation ? Sélectionner les effets les plus pertinents.",
        effectsFr
      ),
      framing(
        "urgent-note",
        "2.6 Note ouverte sur la difficulté",
        "Champ facultatif. Il est possible de laisser la réponse vide.",
        "urgent-difficulty",
        [
          {
            title: "Note ouverte sur la difficulté",
            prompt:
              "Souhaitez-vous ajouter des informations utiles pour mieux comprendre cette difficulté ? Vous pouvez décrire depuis combien de temps elle est présente, pourquoi elle est devenue pertinente, quels obstacles empêchent de l'aborder ou quelles tentatives ont déjà été faites.",
            required: false
          }
        ]
      ),
      framing(
        "short-objective",
        "3. Objectif principal à court terme",
        "Identifier un objectif principal que l'organisation souhaite atteindre dans les 6 à 12 prochains mois.",
        "urgent-difficulty",
        [
          {
            title: "Objectif principal",
            prompt:
              "Pensez aux 6 à 12 prochains mois. Quel est l'objectif principal de durabilité, d'amélioration ou de développement que votre organisation souhaiterait atteindre ? Indiquer un seul objectif principal."
          }
        ]
      ),
      exploration(
        "short-challenges",
        "4. Défis et priorités à court terme",
        "4.1 Sur quels défis opérationnels votre organisation devrait-elle travailler pour atteindre l'objectif à court terme indiqué ? Sélectionner un ou plusieurs défis opérationnels pertinents, au moins un pour chaque domaine (social et environnemental). Si nécessaire, ajouter un défi spécifique qui n'est pas présent dans la liste.",
        shortChallengeGroupsFr.options,
        true,
        undefined,
        shortChallengeGroupsFr.optionGroups,
        shortChallengeGroupsFr.optionGroupAssignments
      ),
      prioritization(
        "short-priorities",
        "4.2 Priorités à court terme",
        "Classer les défis sélectionnés de la priorité la plus élevée à la priorité la plus basse, en tenant compte de l'urgence, de la faisabilité et de l'impact sur la production, l'environnement, la sécurité et les conditions de travail.",
        "short-challenges"
      ),
      framing(
        "short-needs-framing",
        "5. Cadrage des besoins à court terme",
        "Cette section sert à transformer l'objectif et les défis à court terme en besoins opérationnels, actions possibles et formes de soutien.",
        "short-priorities",
        [
          {
            title: "Soutien immédiat",
            prompt:
              "Quel type de soutien aiderait votre organisation à atteindre l'objectif à court terme et à traiter les défis les plus urgents ?"
          },
          {
            title: "Ressources pratiques",
            prompt: "Quels outils, connaissances, formations ou soutiens techniques seraient utiles dans les 6 à 12 prochains mois ?"
          },
          {
            title: "Premier pas",
            prompt: "Quel pourrait être un premier pas réaliste pour commencer à travailler sur cet objectif ?"
          }
        ]
      ),
      framing(
        "medium-objective",
        "6. Objectif principal à moyen-long terme",
        "Identifier un objectif principal que l'organisation souhaite atteindre ou préparer dans les 1 à 5 prochaines années ou plus.",
        undefined,
        [
          {
            title: "Objectif principal",
            prompt:
              "Pensez aux 1 à 5 prochaines années ou plus. Quel est l'objectif principal de durabilité, d'amélioration, de développement ou de transformation qui pourrait devenir le plus pertinent pour votre organisation, votre secteur ou votre territoire ?"
          }
        ]
      ),
      framing(
        "elements-to-value",
        "7. Points forts et impact sur le territoire",
        "Cette section sert à identifier les principaux points forts de l'organisation, les aspects à valoriser et la contribution positive qu'elle peut générer sur le territoire, la communauté locale et le réseau NASIJ.",
        undefined,
        [
          {
            title: "Points forts et impact sur le territoire",
            prompt:
              "Quels sont les principaux points forts de votre entreprise, organisation ou activité ? Quels éléments pensez-vous devoir être reconnus, renforcés ou mieux communiqués ? Quel type d'impact positif pensez-vous pouvoir générer sur le territoire ou la communauté locale ?",
            placeholder:
              "Vous pouvez faire référence, par exemple, aux compétences artisanales, au savoir-faire technique, à la qualité des produits, à la capacité productive, à l'ancrage territorial, aux relations locales, aux pratiques durables déjà existantes, à la culture du travail, à l'innovation, à l'identité d'entreprise, au potentiel de collaboration, aux opportunités d'emploi, à la transmission de compétences, à l'inclusion sociale ou à la contribution au développement de la communauté locale."
          }
        ]
      ),
      framing(
        "network-resources",
        "8. Ressources et contributions pour le réseau NASIJ",
        "Cette section sert à identifier ce que chaque organisation pourrait partager ou mettre à disposition des autres réalités du réseau NASIJ, indépendamment des objectifs ou des défis indiqués dans les sections précédentes.",
        undefined,
        [
          {
            title: "Ressources et contributions",
            prompt:
              "Quelles ressources, compétences, expériences, outils, connaissances, espaces, services ou opportunités votre organisation pourrait-elle mettre à disposition des autres entreprises ou acteurs du réseau NASIJ ?",
            placeholder:
              "Vous pouvez indiquer, par exemple, des compétences techniques, des expériences productives, des connaissances locales, des capacités de formation, une disponibilité à collaborer, un accès à des machines, des espaces, des contacts, de bonnes pratiques, des cas d'étude ou d'autres ressources utiles."
          }
        ]
      ),
      planningReport("fr")
    ]
  };
}

export const nasijAssessmentTemplates = {
  it: buildItalianTemplate(),
  fr: buildFrenchTemplate()
};

export const nasijDefaultAssessmentTemplates = [
  nasijAssessmentTemplates.it,
  nasijAssessmentTemplates.fr
];

export const nasijSustainabilityAssessmentTemplate: AssessmentTemplate = nasijAssessmentTemplates.fr;
