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

export function formaterQuantiteMedicament(medicament, quantite) {
  if (quantite === null || quantite === undefined || quantite === '') return '—';
  return `${quantite} ${medicament.forme === 'solution_buvable' ? 'mL' : 'unité(s)'}`;
}

export async function telechargerOrdonnancePdf(consultation, rendezVous, profil, dossierPatient) {
  const [moduleJsPDF, moduleAutoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const { jsPDF } = moduleJsPDF;
  const autoTable = moduleAutoTable.default ?? moduleAutoTable.autoTable;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const medecin = [profil?.personnel?.prenoms, profil?.personnel?.nom].filter(Boolean).join(' ') || 'Médecin';
  const datePrescription = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(consultation.date_creation));
  const medicaments = consultation.medicaments_prescrits?.length
    ? consultation.medicaments_prescrits
    : consultation.medicaments
      ? [{
        nom: consultation.medicaments,
        matin: consultation.quantite_matin,
        midi: consultation.quantite_midi,
        soir: consultation.quantite_soir,
      }]
      : [];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(11, 20, 64);
  doc.text(medecin, 15, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(rendezVous.specialite || 'Médecin spécialiste', 15, 26);
  doc.text('CENTRE HOSPITALIER DE SOAVINANDRIANA', 15, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('ORDONNANCE', 105, 48, { align: 'center' });
  doc.setDrawColor(52, 87, 220);
  doc.line(15, 54, 195, 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Patient :', 15, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(rendezVous.patient, 38, 64);
  doc.setFont('helvetica', 'bold');
  if (dossierPatient?.patient_date_naissance) {
    doc.text('Date de naissance :', 15, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(new Intl.DateTimeFormat('fr-FR').format(
      new Date(`${dossierPatient.patient_date_naissance}T00:00:00`),
    ), 48, 71);
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Date :', 15, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(datePrescription, 38, 78);

  const libellesForme = {
    comprime: 'Comprimé',
    solution_buvable: 'Solution buvable',
    gelule: 'Gélule',
    autre: 'Autre',
  };
  const libellesIndication = {
    'Traitement de fond de la migraine': 'Traitement de fond de la migraine',
    'Traitement de la crise migraineuse': 'Traitement de la crise migraineuse',
    'Traitement des douleurs neuropathiques': 'Traitement des douleurs neuropathiques',
    Autre: 'Autre traitement',
  };
  const textePosologie = (medicament) => {
    const moments = [
      medicament.matin !== null && medicament.matin !== undefined && `Matin : ${formaterQuantiteMedicament(medicament, medicament.matin)}`,
      medicament.midi !== null && medicament.midi !== undefined && `Midi : ${formaterQuantiteMedicament(medicament, medicament.midi)}`,
      medicament.soir !== null && medicament.soir !== undefined && `Soir : ${formaterQuantiteMedicament(medicament, medicament.soir)}`,
    ].filter(Boolean);
    if (medicament.duree_jours) moments.push(`pendant ${medicament.duree_jours} jour(s)`);
    if (medicament.posologie) moments.push(medicament.posologie);
    return moments.join(', ') || 'Posologie non précisée';
  };

  autoTable(doc, {
    startY: 87,
    head: [['Traitement', 'Médicament et posologie']],
    body: medicaments.length
      ? medicaments.map((medicament) => [
        libellesIndication[medicament.indication] || 'Prescription',
        `${medicament.nom}${medicament.forme ? ` (${libellesForme[medicament.forme] || medicament.forme})` : ''}\n${textePosologie(medicament)}`,
      ])
      : [['Prescription', 'Aucun médicament prescrit']],
    theme: 'grid',
    headStyles: { fillColor: [27, 46, 122] },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 115 } },
  });

  let positionSuivante = doc.lastAutoTable.finalY + 8;
  if (consultation.controle_supplementaire) {
    autoTable(doc, {
      startY: positionSuivante,
      head: [['Contrôle / examen complémentaire']],
      body: [[consultation.controle_supplementaire]],
      theme: 'grid',
      headStyles: { fillColor: [27, 46, 122] },
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
    });
    positionSuivante = doc.lastAutoTable.finalY + 8;
  }
  autoTable(doc, {
    startY: positionSuivante,
    head: [['Remarques médicales']],
    body: [[consultation.remarques || '—']],
    theme: 'grid',
    headStyles: { fillColor: [27, 46, 122] },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
  });
  let positionSignature = doc.lastAutoTable.finalY + 20;
  if (positionSignature > 245) {
    doc.addPage();
    positionSignature = 240;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fait le ${datePrescription}`, 15, positionSignature);
  doc.setFont('helvetica', 'bold');
  doc.text(medecin, 145, positionSignature + 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Signature du médecin', 145, positionSignature + 21, { align: 'center' });

  const nomFichier = rendezVous.patient
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  doc.save(`Ordonnance_${nomFichier || 'patient'}_${consultation.id.slice(0, 8)}.pdf`);
}
