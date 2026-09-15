import type { Locale } from "@/types/locale";

export const LEGAL_DOCUMENT_VERSION = "2026-09-16";
export const LEGAL_ACCEPTANCE_KEY = "terms-and-data-processing-agreement";

export type LegalDocumentId = "privacy" | "terms" | "data-processing" | "cookies";

type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

type LegalDocument = {
  title: string;
  intro: string;
  updatedLabel: string;
  sections: LegalSection[];
};

const operator = "Luca Incrocci";
const contact = "l.incrocci.design@gmail.com";

const documents: Record<Locale, Record<LegalDocumentId, LegalDocument>> = {
  it: {
    privacy: {
      title: "Informativa privacy",
      intro: "Questa informativa descrive il trattamento dei dati personali effettuato tramite Ritual. È valida dal 16 settembre 2026.",
      updatedLabel: "Versione 16 settembre 2026",
      sections: [
        { heading: "Titolare e contatto", paragraphs: [`Per i dati dell’account, la sicurezza del servizio e la gestione tecnica della piattaforma, il titolare del trattamento è ${operator}. Per richieste privacy puoi scrivere a ${contact}.`] },
        { heading: "Ruoli nel trattamento", paragraphs: ["Chi crea o gestisce un assessment decide perché e come raccogliere le risposte dei partecipanti: è il titolare del trattamento di tali risposte.", "Ritual fornisce l’infrastruttura tecnica e tratta le risposte per conto dell’organizzatore, secondo l’Accordo sul trattamento dei dati. L’organizzatore deve fornire ai partecipanti la propria informativa privacy e disporre di una base giuridica adeguata."] },
        { heading: "Dati e finalità", paragraphs: ["Trattiamo email, nome utente, dati di accesso e dati tecnici strettamente necessari per creare l’account, autenticare gli utenti, prevenire abusi, erogare il servizio, conservare gli assessment e supportare gli utenti.", "Le risposte inviate dai partecipanti sono trattate esclusivamente per erogare l’assessment e renderle disponibili all’organizzatore autorizzato. Ritual non usa questi dati per pubblicità, profilazione commerciale o decisioni automatizzate."] },
        { heading: "Base giuridica", paragraphs: ["Per gli utenti registrati, il trattamento necessario a fornire Ritual si basa sull’esecuzione del servizio richiesto; le misure di sicurezza e prevenzione degli abusi si basano anche sul legittimo interesse a proteggere la piattaforma.", "Per le risposte dei partecipanti, la base giuridica è individuata dall’organizzatore dell’assessment, che resta responsabile della relativa scelta e comunicazione."] },
        { heading: "Fornitori e trasferimenti", paragraphs: ["Per ospitare, autenticare gli utenti, inviare email di servizio e proteggere i moduli da abusi, Ritual usa fornitori tecnici quali Supabase, Vercel, Resend e Cloudflare Turnstile. Essi trattano soltanto quanto necessario a fornire i rispettivi servizi.", "Quando un fornitore tratta dati fuori dallo Spazio economico europeo, il trasferimento deve avvenire con le garanzie previste dalla normativa applicabile. Le configurazioni e gli accordi con i fornitori sono soggetti a revisione periodica."] },
        { heading: "Conservazione e cancellazione", paragraphs: ["I dati dell’account e i contenuti restano disponibili finché l’account è attivo. La cancellazione dell’account rimuove i dati operativi associati, inclusi assessment e risposte, secondo il ciclo tecnico del servizio.", "Copie tecniche di sicurezza possono persistere per il tempo strettamente previsto dai sistemi dei fornitori, senza essere usate per altre finalità. Gli organizzatori devono definire e comunicare ai partecipanti i propri tempi di conservazione."] },
        { heading: "Diritti e reclami", paragraphs: ["Puoi chiedere accesso, rettifica, cancellazione, limitazione, opposizione o portabilità nei casi previsti dalla legge scrivendo al contatto indicato sopra. Puoi inoltre proporre reclamo al Garante per la protezione dei dati personali."] }
      ]
    },
    terms: {
      title: "Termini di servizio",
      intro: "Questi Termini regolano l’uso gratuito di Ritual da parte degli utenti registrati. Sono validi dal 16 settembre 2026.",
      updatedLabel: "Versione 16 settembre 2026",
      sections: [
        { heading: "Il servizio", paragraphs: ["Ritual consente di creare, gestire, condividere e analizzare assessment. Il servizio è attualmente gratuito e può evolvere; eventuali condizioni economiche future saranno comunicate prima della loro applicazione."] },
        { heading: "Account e accesso", paragraphs: ["L’utente è responsabile delle credenziali, dell’accuratezza dei dati dell’account e dell’uso effettuato dagli eventuali collaboratori a cui concede accesso. L’account è personale e non deve essere condiviso."] },
        { heading: "Responsabilità dell’organizzatore", paragraphs: ["Chi crea, pubblica o gestisce un assessment è responsabile di finalità, contenuti, destinatari, base giuridica, informative ai partecipanti e istruzioni di trattamento. Deve avere l’autorità per coinvolgere persone e organizzazioni interessate.", "L’organizzatore garantisce che domande, istruzioni, condivisioni ed esportazioni rispettano la legge applicabile e i diritti di terzi. Deve usare i livelli di accesso con prudenza e revocarli quando non più necessari."], bullets: ["Non deve chiedere o inserire dati sanitari, genetici, biometrici, politici, religiosi, sindacali, giudiziari o altre categorie particolari di dati personali.", "Non deve usare Ritual per decisioni automatizzate che producano effetti giuridici o conseguenze analogamente significative sulle persone.", "Non deve pubblicare contenuti illeciti, discriminatori, lesivi dei diritti altrui o dati personali non necessari."] },
        { heading: "Dati, sicurezza e cancellazione", paragraphs: ["L’utente può cancellare il proprio account dall’applicazione. La cancellazione è definitiva per i dati operativi associati. Prima di eliminare un assessment o un account, l’organizzatore deve valutare i propri obblighi di conservazione, informazione e gestione dei rapporti con i partecipanti."] },
        { heading: "Limitazioni", paragraphs: ["Ritual adotta misure ragionevoli per mantenere il servizio disponibile e sicuro, ma non garantisce assenza assoluta di interruzioni o errori. Nei limiti massimi consentiti dalla legge, l’organizzatore manleva il gestore del servizio dalle pretese derivanti da contenuti, istruzioni o trattamenti determinati dall’organizzatore stesso.", "Questa clausola non esclude responsabilità che la legge non consente di escludere, né gli obblighi propri del gestore di Ritual."] },
        { heading: "Contatti e modifiche", paragraphs: [`Per comunicazioni sui Termini scrivi a ${contact}. Le modifiche sostanziali saranno pubblicate prima dell’efficacia; se necessario sarà richiesta una nuova accettazione.`] }
      ]
    },
    "data-processing": {
      title: "Accordo sul trattamento dei dati",
      intro: "Questo accordo disciplina il trattamento delle risposte dei partecipanti da parte di Ritual per conto dell’organizzatore dell’assessment.",
      updatedLabel: "Versione 16 settembre 2026",
      sections: [
        { heading: "Parti e ruoli", paragraphs: [`L’utente che crea o gestisce un assessment agisce come titolare del trattamento delle risposte raccolte. ${operator}, gestore di Ritual, agisce come responsabile del trattamento limitatamente ai servizi tecnici forniti tramite la piattaforma.`] },
        { heading: "Oggetto e istruzioni", paragraphs: ["Il responsabile tratta dati degli utenti e dei partecipanti esclusivamente per autenticazione, ospitalità, raccolta, conservazione, visualizzazione, condivisione autorizzata ed esportazione degli assessment, seguendo le istruzioni documentate dell’organizzatore contenute nell’uso della piattaforma.", "Il trattamento dura per il periodo di erogazione del servizio e fino alla cancellazione dei dati operativi, salvo obblighi di legge o copie tecniche di sicurezza strettamente necessarie."] },
        { heading: "Obblighi dell’organizzatore", paragraphs: ["L’organizzatore garantisce di avere una base giuridica valida, di aver reso l’informativa ai partecipanti, di gestire le richieste sui diritti e di non usare Ritual per categorie particolari di dati o dati giudiziari."] },
        { heading: "Sicurezza e riservatezza", paragraphs: ["Il responsabile adotta misure tecniche e organizzative proporzionate al rischio, inclusi controllo degli accessi, separazione dei privilegi, autenticazione, cifratura in transito, limitazione dei dati e registrazione tecnica delle accettazioni. Le persone autorizzate al trattamento sono soggette a obblighi di riservatezza." ] },
        { heading: "Sub-responsabili", paragraphs: ["Ritual può avvalersi di fornitori tecnici necessari per l’erogazione del servizio, inclusi hosting, database, autenticazione, invio email e protezione anti-abuso. Il responsabile mantiene accordi adeguati con tali fornitori e resta responsabile nei limiti previsti dalla legge."] },
        { heading: "Assistenza, incidenti e fine del servizio", paragraphs: ["Ritual fornisce ragionevole assistenza tecnica all’organizzatore per le richieste sui dati compatibili con la piattaforma. In caso di violazione dei dati personali che riguardi i dati trattati per conto dell’organizzatore, Ritual lo informa senza indebito ritardo con le informazioni disponibili.", "Alla cessazione o cancellazione dell’account, i dati operativi sono eliminati secondo il ciclo tecnico del servizio, salvo conservazione necessaria per obblighi legali o copie di sicurezza temporanee."] }
      ]
    },
    cookies: {
      title: "Cookie e tecnologie essenziali",
      intro: "Ritual usa solo tecnologie necessarie al funzionamento, alla sicurezza e alla memoria delle preferenze strettamente tecniche.",
      updatedLabel: "Versione 16 settembre 2026",
      sections: [
        { heading: "Cosa utilizziamo", paragraphs: ["Usiamo cookie o tecnologie equivalenti per mantenere la sessione di accesso, ricordare la lingua scelta, proteggere i moduli dagli abusi e garantire le funzionalità tecniche della piattaforma."] },
        { heading: "Cosa non utilizziamo", paragraphs: ["Non usiamo cookie pubblicitari, strumenti di profilazione commerciale, tracciamento cross-site o analytics non essenziali."] },
        { heading: "Gestione", paragraphs: ["Puoi eliminare o bloccare cookie e dati locali dalle impostazioni del browser. Alcune funzioni, come l’accesso o la preferenza di lingua, potrebbero smettere di funzionare correttamente."] }
      ]
    }
  },
  en: {},
  fr: {}
} as Record<Locale, Record<LegalDocumentId, LegalDocument>>;

// The Italian text is the governing version accepted in-app. Until a lawyer has
// reviewed translated legal texts, other locales intentionally display it rather
// than presenting an unreviewed translation as legally equivalent.
documents.en = documents.it;
documents.fr = documents.it;

export function getLegalDocument(locale: Locale, document: LegalDocumentId) {
  return documents[locale][document];
}

export const legalDocumentLinks: Array<{ id: LegalDocumentId; label: Record<Locale, string> }> = [
  { id: "privacy", label: { it: "Privacy", en: "Privacy", fr: "Confidentialité" } },
  { id: "terms", label: { it: "Termini", en: "Terms", fr: "Conditions" } },
  { id: "data-processing", label: { it: "Accordo dati", en: "Data agreement", fr: "Accord de données" } },
  { id: "cookies", label: { it: "Cookie", en: "Cookies", fr: "Cookies" } }
];
