export const LIBELLE_STATUT = {
  en_attente: 'En attente',
  confirme: 'Confirmé',
  refuse: 'Refusé',
  annule: 'Annulé',
  arrive: 'Arrivé',
  termine: 'Terminé',
  absent: 'Absent',
};

export function formaterRendezVous(rdv) {
  const dateAffichee = rdv.date_confirmee || rdv.date_souhaitee;
  const date = new Date(dateAffichee);
  return {
    ...rdv,
    patient: `${rdv.patient_prenoms} ${rdv.patient_nom}`.trim(),
    specialite: rdv.service_nom,
    statutApi: rdv.statut,
    date: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date),
    heure: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date),
    statut: LIBELLE_STATUT[rdv.statut] || rdv.statut,
  };
}

export function versDateLocaleInput(valeur) {
  if (!valeur) return '';
  const date = new Date(valeur);
  const decalage = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - decalage).toISOString().slice(0, 16);
}

export function formaterDate(valeur) {
  return valeur
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(valeur))
    : 'Non renseignée';
}

export function obtenirNomUtilisateur(profil) {
  const profilMetier = profil?.patient || profil?.personnel;
  return [profilMetier?.prenoms, profilMetier?.nom].filter(Boolean).join(' ') || 'Utilisateur';
}

export function cleDateLocale(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
