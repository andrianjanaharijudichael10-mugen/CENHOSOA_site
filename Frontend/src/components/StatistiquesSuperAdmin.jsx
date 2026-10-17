const COULEURS = ['#1F7A8C', '#7FD1CB', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#64748b'];

const LIBELLES_ROLES = {
  patient: 'Patients',
  secretaire: 'Secrétaires',
  regulateur_ambulance: 'Régulateurs ambulance',
  medecin: 'Médecins',
  major: 'Majors',
  major_de_garde: 'Majors de garde',
  chef_division_auto: 'Chefs Division Auto',
  chef_sim: 'Chefs SIM',
  superadmin: 'Super administrateurs',
};

const LIBELLES_STATUTS_LITS = {
  libre: 'Libres',
  reserve: 'Réservés',
  occupe: 'Occupés',
  nettoyage: 'En nettoyage',
};

const LIBELLES_CATEGORIES_LITS = {
  vip: 'VIP',
  salle_septique: 'Salle septique',
  dechocage: 'Déchoquage',
  urgence: 'Urgence',
  triage: 'Triage',
};

const LIBELLES_STATUTS_RDV = {
  en_attente: 'En attente',
  confirme: 'Confirmés',
  arrive: 'Arrivés',
  termine: 'Terminés',
  refuse: 'Refusés',
  annule: 'Annulés',
  absent: 'Absents',
};

function construireRepartition(elements, cle, libelles = {}) {
  const totaux = elements.reduce((resultat, element) => {
    const valeur = element[cle];
    resultat[valeur] = (resultat[valeur] || 0) + 1;
    return resultat;
  }, {});
  return Object.entries(totaux).map(([valeur, total]) => ({
    label: libelles[valeur] || valeur,
    valeur: total,
  }));
}

function CarteGraphique({
  titre,
  description,
  items,
  valeurCentre,
  libelleCentre = 'au total',
}) {
  const total = items.reduce((somme, item) => somme + item.valeur, 0);
  const gradient = items.map((item, index) => {
    const debut = items
      .slice(0, index)
      .reduce((somme, precedent) => somme + (total ? (precedent.valeur / total) * 100 : 0), 0);
    const fin = debut + (total ? (item.valeur / total) * 100 : 0);
    return `${COULEURS[index % COULEURS.length]} ${debut}% ${fin}%`;
  }).join(', ');

  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-bold text-[#0A2233]">{titre}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      {total ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          <div
            className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${gradient})` }}
            role="img"
            aria-label={`${titre} : ${total} au total`}
          >
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white shadow-inner">
              <span className="text-2xl font-light tabular-nums text-[#0A2233]">{valeurCentre ?? total}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{libelleCentre}</span>
            </div>
          </div>
          <div className="w-full max-w-64 space-y-2.5 text-xs">
            {items.map((item, index) => (
              <p key={item.label} className="flex items-center gap-2 font-semibold text-slate-700">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: COULEURS[index % COULEURS.length] }} />
                <span>{item.label}</span>
                <span className="ml-auto font-bold tabular-nums text-[#0A2233]">{item.valeur}</span>
              </p>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
          Aucune donnée à afficher pour le moment.
        </p>
      )}
    </article>
  );
}

function CarteBarres({ titre, description, items }) {
  const maximum = Math.max(1, ...items.map((item) => item.valeur));

  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-bold text-[#0A2233]">{titre}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      {items.length ? (
        <div className="mt-5 max-h-64 space-y-4 overflow-y-auto pr-1" role="img" aria-label={titre}>
          {items.map((item, index) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-semibold text-slate-700">{item.label}</span>
                <span className="shrink-0 font-bold tabular-nums text-[#0A2233]">{item.valeur}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.valeur / maximum) * 100}%`,
                    backgroundColor: COULEURS[index % COULEURS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
          Aucune donnée à afficher pour le moment.
        </p>
      )}
    </article>
  );
}

function SectionStatistiques({ titre, description, enfants }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#5B7480]">Vue d’ensemble</p>
        <h2 className="mt-1 text-xl font-bold text-[#0A2233]">{titre}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">{enfants}</div>
    </section>
  );
}

const LIBELLES_STATUTS_MISSIONS = {
  en_attente_confirmation: 'En attente de confirmation',
  assigne: 'Assignées',
  sur_les_lieux: 'Sur les lieux',
  en_transport: 'En transport',
  arrive_urgences: 'Arrivées aux urgences',
  en_bionettoyage: 'En bionettoyage',
  en_cours: 'En cours',
  terminee: 'Terminées',
  annulee: 'Annulées',
};

export function GraphiquesUrgences({ ambulances, missions, lits }) {
  const statutsAmbulances = [
    { label: 'Disponibles', valeur: ambulances.filter((ambulance) => ambulance.statut === 'disponible').length },
    { label: 'En mission / indisponibles', valeur: ambulances.filter((ambulance) => ambulance.statut !== 'disponible').length },
  ];
  const tauxOccupation = lits.length
    ? Math.round((lits.filter((lit) => lit.statut === 'occupe').length / lits.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <SectionStatistiques
        titre="Ambulances"
        description="Disponibilité de la flotte et répartition des missions selon leur statut."
        enfants={<>
          <CarteGraphique
            titre="Disponibilité de la flotte"
            description={`${ambulances.length} ambulance(s) enregistrée(s).`}
            items={statutsAmbulances}
          />
          <CarteBarres
            titre="Missions par statut"
            description={`${missions.length} mission(s) enregistrée(s).`}
            items={construireRepartition(missions, 'statut', LIBELLES_STATUTS_MISSIONS)}
          />
        </>}
      />

      <SectionStatistiques
        titre="Lits d’urgence"
        description="État actuel des lits et répartition de l’inventaire par catégorie."
        enfants={<>
          <CarteGraphique
            titre="État des lits"
            description={`${lits.length} lit(s) configuré(s).`}
            items={construireRepartition(lits, 'statut', LIBELLES_STATUTS_LITS)}
            valeurCentre={`${tauxOccupation}%`}
            libelleCentre="occupés"
          />
          <CarteBarres
            titre="Lits par catégorie"
            description="Nombre de lits configurés dans chaque catégorie."
            items={construireRepartition(lits, 'categorie', LIBELLES_CATEGORIES_LITS)}
          />
        </>}
      />
    </div>
  );
}

export default function StatistiquesSuperAdmin({
  utilisateurs,
  ambulances,
  missions,
  lits,
  statistiquesRendezVous,
}) {
  const comptesActifs = utilisateurs.filter((utilisateur) => utilisateur.est_actif).length;
  const statutsAmbulances = [
    { label: 'Disponibles', valeur: ambulances.filter((ambulance) => ambulance.statut === 'disponible').length },
    { label: 'En mission / indisponibles', valeur: ambulances.filter((ambulance) => ambulance.statut !== 'disponible').length },
  ];
  const rendezVousParStatut = Object.entries(statistiquesRendezVous?.statuts || {}).map(([statut, valeur]) => ({
    label: LIBELLES_STATUTS_RDV[statut] || statut,
    valeur,
  }));
  const statistiquesMensuelles = (statistiquesRendezVous?.mensuel || []).map(({ annee, mois, total }) => ({
    label: new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' })
      .format(new Date(annee, mois - 1, 1))
      .replace('.', ''),
    valeur: total,
  }));

  return (
    <div className="apparition space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1F7A8C]">Pilotage du centre</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#0A2233]">Statistiques des modules métiers</h2>
        <p className="mt-2 text-sm text-slate-600">Vue consolidée des comptes, ambulances, lits d’urgence et rendez-vous.</p>
      </div>

      <SectionStatistiques
        titre="Comptes utilisateurs"
        description="Répartition des comptes par rôle et état d’activation."
        enfants={<>
          <CarteGraphique
            titre="Comptes actifs et désactivés"
            description="État d’accès des comptes enregistrés."
            items={[
              { label: 'Actifs', valeur: comptesActifs },
              { label: 'Désactivés', valeur: utilisateurs.length - comptesActifs },
            ]}
          />
          <CarteBarres
            titre="Comptes par rôle"
            description="Nombre de comptes associés à chaque profil."
            items={construireRepartition(utilisateurs, 'role', LIBELLES_ROLES)}
          />
        </>}
      />

      <SectionStatistiques
        titre="Ambulances"
        description="Disponibilité de la flotte et état opérationnel des missions."
        enfants={<>
          <CarteGraphique
            titre="Disponibilité de la flotte"
            description={`${ambulances.length} ambulance(s) enregistrée(s).`}
            items={statutsAmbulances}
          />
          <CarteBarres
            titre="Missions par statut"
            description={`${missions.length} mission(s) enregistrée(s).`}
            items={construireRepartition(missions, 'statut')}
          />
        </>}
      />

      <SectionStatistiques
        titre="Lits d’urgence"
        description="Occupation actuelle et répartition de l’inventaire par catégorie."
        enfants={<>
          <CarteGraphique
            titre="État des lits"
            description={`${lits.length} lit(s) configuré(s).`}
            items={construireRepartition(lits, 'statut', LIBELLES_STATUTS_LITS)}
          />
          <CarteBarres
            titre="Lits par catégorie"
            description="Nombre de lits configurés dans chaque catégorie."
            items={construireRepartition(lits, 'categorie', LIBELLES_CATEGORIES_LITS)}
          />
        </>}
      />

      <SectionStatistiques
        titre="Rendez-vous"
        description={`${statistiquesRendezVous?.total || 0} rendez-vous au total · évolution sur les six derniers mois.`}
        enfants={<>
          <CarteGraphique
            titre="Rendez-vous par statut"
            description="Répartition de tous les rendez-vous, tous services confondus."
            items={rendezVousParStatut}
          />
          <CarteBarres
            titre="Évolution mensuelle"
            description="Nombre de rendez-vous par mois sur les six derniers mois."
            items={statistiquesMensuelles}
          />
        </>}
      />
    </div>
  );
}
