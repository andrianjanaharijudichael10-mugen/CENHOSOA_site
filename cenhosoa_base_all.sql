--
-- PostgreSQL database dump
--

\restrict zj9JEApt0hDmy05kqy4rRMzglx6KxGJND0natjcah08chRt979kwOuoQBUAuW90

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-10-14 09:30:18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5048 (class 0 OID 58314)
-- Dependencies: 219
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
6e8f1a2c4b57
\.


--
-- TOC entry 5057 (class 0 OID 66407)
-- Dependencies: 228
-- Data for Name: ambulances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ambulances (id, statut, date_creation, numero, est_principale) FROM stdin;
548fceea-f48e-415c-aec8-e9e0b4514a18	DISPONIBLE	2026-10-10 02:08:53.018824+02	AMB-003	f
790bcad0-f163-467a-ae1e-b54c956ad38a	DISPONIBLE	2026-10-10 02:08:58.244055+02	AMB-004	f
7f94102d-4f63-4735-960c-3e766b2aaa33	DISPONIBLE	2026-10-10 02:08:45.135031+02	AMB-002	f
a631de60-05dd-427b-a6fe-5b2193cfc79a	DISPONIBLE	2026-10-10 02:08:06.557681+02	AMB-001	t
\.


--
-- TOC entry 5062 (class 0 OID 99280)
-- Dependencies: 233
-- Data for Name: categories_lits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories_lits (cle, nom) FROM stdin;
vip	VIP
salle_septique	Salle septique
dechocage	Déchoquage
urgence	Urgence
triage	Triage
\.


--
-- TOC entry 5054 (class 0 OID 58398)
-- Dependencies: 225
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id, nom, description, responsable, horaires, localisation, telephone, est_actif, date_creation, date_modification, photo_responsable_url) FROM stdin;
0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	Neurologie	Dr RAKOTOBE	8h-10h	Premiere etage	+261385566677	t	2026-10-10 01:56:28.229439+02	2026-10-13 20:48:46.974712+02	http://localhost:8000/fichiers/uploads/services/5bcc02ad-8a38-4499-907d-07ee4826bd4c.jpg
a5d066eb-fb43-4a66-880e-91bdd353fca8	Dermatologie	Dermatologie	Dr.RASOA	8h-11h	Premiere etage B	+261 33 55 666 77	t	2026-10-12 23:47:19.42799+02	2026-10-13 20:49:00.807736+02	http://localhost:8000/fichiers/uploads/services/25999f66-1045-41ed-ae6d-a5c2d9fdd020.png
\.


--
-- TOC entry 5061 (class 0 OID 74644)
-- Dependencies: 232
-- Data for Name: creneaux_medecin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.creneaux_medecin (id, service_id, date_heure, est_ouvert, date_creation, date_fin, dernier_numero_file) FROM stdin;
800ec471-20c2-4bd9-a1de-6eed08a5b51a	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	2026-10-12 08:00:00+02	f	2026-10-12 00:36:44.110555+02	2026-10-12 11:00:00+02	2
4bd4dc5a-65a1-4b07-a85b-a9ad3f9f1ca2	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	2026-10-14 14:00:00+02	t	2026-10-13 20:54:51.016173+02	2026-10-14 16:00:00+02	2
e82f2fac-f6ed-41a9-9cf1-98a0402970a4	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	2026-10-14 08:00:00+02	f	2026-10-13 20:54:29.3087+02	2026-10-14 12:00:00+02	1
\.


--
-- TOC entry 5049 (class 0 OID 58331)
-- Dependencies: 220
-- Data for Name: utilisateurs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utilisateurs (id, mot_de_passe_hash, role, est_actif, date_creation, derniere_connexion, identifiant) FROM stdin;
17feca96-2079-4ffe-b1c4-e05f2a9259db	$2b$12$fEdT/B1.fQwtZ8VbC2QnU.nO7nSjj5IIiRKoopgUn5C8oRfrU2sbm	PATIENT	t	2026-10-10 02:28:09.351891+02	2026-10-14 06:01:42.592905+02	+261339933053
911400d6-9bec-491f-b12a-c6f1ec5f6948	$2b$12$zbd.cNmBp/yKji.yOh3n4u4Ni24dI2jDj86ky4TIemfV99W3KpERS	SUPERADMIN	t	2026-10-10 01:05:40.286458+02	2026-10-14 09:07:17.624606+02	admin-cenhosoa
f3073832-3b32-4684-9ca1-908a0e95f313	$2b$12$qyVmAF2BGnR.CoBHZCyALuR/HqTDvuhh2EIU0WKbZJsZkAKUgc1bu	REGULATEUR_AMBULANCE	t	2026-10-12 04:01:15.050598+02	2026-10-14 09:08:33.651987+02	Reg-001
14392ea4-0bbc-4348-b7f6-bae4a452c0a9	$2b$12$UmYz3L7NalOBsSdq9PI4ROTA3JlxhHZwnJFoUwShVQTu6v4Qjue9m	SUPERADMIN	t	2026-10-11 23:55:36.019716+02	2026-10-13 20:44:53.163697+02	andry-001
f77bbce0-eefc-4a35-92d3-357b1bbe2af4	$2b$12$51HhbUN8cS1loeF9.T3Hr.OPZqzc3p2OmNpsXcbwI6a8z/3RDbJra	PATIENT	t	2026-10-12 00:38:59.524793+02	2026-10-13 21:15:35.010815+02	+261330000000
ae9d6adf-2e65-4011-81ed-53e3ac8a2e3b	$2b$12$ikApjFKQlR95og898vbq3O4tE6inNmhoM6vNUcKWmQkveTo4V1/06	MEDECIN	t	2026-10-10 04:52:14.207923+02	2026-10-14 04:56:48.957652+02	Rakoto-001
03323464-62e6-4ba7-a759-950e4426687e	$2b$12$BGW9k1p7A30TqD7B9uBsCOIq/VlHUsPU3mBsUDTGAPA8tgz4uSMSG	SECRETAIRE	t	2026-10-12 00:31:13.382456+02	2026-10-14 04:57:47.356378+02	Judi-001
3a78c15c-5640-4c4f-abc0-4d57558ffa6f	$2b$12$m3Re6tgXuQEmZlaKfXSH5ebrrCrl8S0Kiu94PLd6Wbm8B1gVc1wL2	MAJOR_DE_GARDE	t	2026-10-12 04:13:48.874152+02	2026-10-14 06:00:09.729958+02	major-001
\.


--
-- TOC entry 5050 (class 0 OID 58346)
-- Dependencies: 221
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id, utilisateur_id, nom, prenoms, telephone, date_naissance, adresse, date_creation, lieu_naissance, photo_profil) FROM stdin;
deb1ecfe-3f66-4819-a890-be97dcf586b6	f77bbce0-eefc-4a35-92d3-357b1bbe2af4	RASOANIRINA	Rasoa	+261330000000	2005-10-07	Ampasampito	2026-10-12 00:38:59.524793+02	Sakaraha	deb1ecfe-3f66-4819-a890-be97dcf586b6-171a59f291174826bdf7a1ea8547c4b6.png
b1650edb-39b4-4d29-83a9-2c64669dadcb	17feca96-2079-4ffe-b1c4-e05f2a9259db	Guy	Judichaël	+261339933053	2006-01-21	Nanisana	2026-10-10 02:28:09.351891+02	Soavinandriana	\N
\.


--
-- TOC entry 5051 (class 0 OID 58366)
-- Dependencies: 222
-- Data for Name: personnels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personnels (id, utilisateur_id, nom, prenoms, matricule, service, telephone, date_creation) FROM stdin;
32f681ae-7ced-4c25-967e-b1108f7955f1	ae9d6adf-2e65-4011-81ed-53e3ac8a2e3b	RAKOTOBE	Rabe	Rakoto-001	Neurologie	+261334444444	2026-10-10 04:52:14.207923+02
7d9362f5-ed9e-454f-8a9a-1837a0ec8855	14392ea4-0bbc-4348-b7f6-bae4a452c0a9	Andry	Andry	andry-001	\N	+261339999999	2026-10-11 23:55:36.019716+02
2f067a6e-7ae1-4e80-b8e8-575b5fa10cb6	03323464-62e6-4ba7-a759-950e4426687e	Guy	Judichaël 	Judi-001	Neurologie	\N	2026-10-12 00:31:13.382456+02
6bb6925c-1842-4816-8d21-a7361a7c2ff6	f3073832-3b32-4684-9ca1-908a0e95f313	Ambulance	Reg	Reg-001	\N	\N	2026-10-12 04:01:15.050598+02
d10ad510-645e-4ff3-9bc1-a49d009793a1	3a78c15c-5640-4c4f-abc0-4d57558ffa6f	Grd	Major	major-001	\N	\N	2026-10-12 04:13:48.874152+02
\.


--
-- TOC entry 5059 (class 0 OID 74580)
-- Dependencies: 230
-- Data for Name: rendez_vous; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rendez_vous (id, patient_id, service_id, service_nom, date_souhaitee, date_confirmee, motif, statut, commentaire, date_creation, date_modification, creneau_id, numero_file, date_confirmee_vue) FROM stdin;
3f83ca38-f47f-4240-a249-96c1d2943337	b1650edb-39b4-4d29-83a9-2c64669dadcb	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	2026-10-13 07:00:00+02	2026-10-13 07:00:00+02	Consultation	termine	\N	2026-10-10 04:46:02.03655+02	2026-10-10 04:55:34.571121+02	\N	\N	\N
ff999365-26d4-45b2-bec4-44dd8c9f8d3f	deb1ecfe-3f66-4819-a890-be97dcf586b6	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	2026-10-12 08:00:00+02	2026-10-12 08:00:00+02	Consultation	termine	\N	2026-10-12 00:39:27.947723+02	2026-10-12 02:23:56.270173+02	800ec471-20c2-4bd9-a1de-6eed08a5b51a	1	\N
66dfd812-46eb-4622-aae2-c87bf09b1d03	b1650edb-39b4-4d29-83a9-2c64669dadcb	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	2026-10-12 08:00:00+02	2026-10-12 08:00:00+02	Consultation	termine	\N	2026-10-12 00:40:11.750659+02	2026-10-12 02:29:24.72043+02	800ec471-20c2-4bd9-a1de-6eed08a5b51a	2	2026-10-12 08:00:00+02
fa841cc9-2209-41d8-b730-34a2897281db	b1650edb-39b4-4d29-83a9-2c64669dadcb	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	2026-10-19 08:00:00+02	2026-10-19 08:00:00+02	Suivi médical	annule	\N	2026-10-12 02:29:24.72043+02	2026-10-13 20:56:18.186748+02	\N	\N	2026-10-19 08:00:00+02
b22e3296-f801-4c26-b278-4068a44f1d33	b1650edb-39b4-4d29-83a9-2c64669dadcb	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	2026-10-14 08:00:00+02	2026-10-14 08:00:00+02	Consultation Malade	termine	\N	2026-10-13 20:56:21.294428+02	2026-10-13 21:05:59.452217+02	e82f2fac-f6ed-41a9-9cf1-98a0402970a4	1	2026-10-14 08:00:00+02
c83bd2e6-52ba-44d4-a208-4f008cbe9991	deb1ecfe-3f66-4819-a890-be97dcf586b6	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	2026-10-14 14:00:00+02	\N	Suivi	refuse	\N	2026-10-13 21:13:48.998305+02	2026-10-13 21:14:15.365617+02	4bd4dc5a-65a1-4b07-a85b-a9ad3f9f1ca2	1	\N
e6beced2-a590-4490-b0aa-5475b71a623c	b1650edb-39b4-4d29-83a9-2c64669dadcb	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	2026-10-28 08:00:00+01	2026-10-28 08:00:00+01	Suivi médical	confirme	\N	2026-10-13 21:05:59.452217+02	2026-10-13 21:19:59.674815+02	\N	\N	2026-10-28 08:00:00+01
213af696-89a6-4e0e-9a59-6af1f8b6ea75	deb1ecfe-3f66-4819-a890-be97dcf586b6	0b23cd08-3b03-4dbb-b0c5-e1e42b6a0b00	Neurologie	2026-10-14 14:00:00+02	2026-10-14 14:00:00+02	Suivi	termine	\N	2026-10-13 21:14:38.065319+02	2026-10-14 04:15:55.312731+02	4bd4dc5a-65a1-4b07-a85b-a9ad3f9f1ca2	2	2026-10-14 14:00:00+02
\.


--
-- TOC entry 5060 (class 0 OID 74612)
-- Dependencies: 231
-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultations (id, patient_id, rendez_vous_id, medecin_id, remarques, ordonnance, date_creation, medicaments, quantite_matin, quantite_midi, quantite_soir, medicaments_prescrits, controle_supplementaire) FROM stdin;
0e73809c-2cd8-4d20-a949-f72f0c5294bc	b1650edb-39b4-4d29-83a9-2c64669dadcb	3f83ca38-f47f-4240-a249-96c1d2943337	32f681ae-7ced-4c25-967e-b1108f7955f1	Migraine	\N	2026-10-10 04:55:34.571121+02	\N	\N	\N	\N	[]	\N
0630c003-caa2-4001-9b2f-40277a3b30a9	deb1ecfe-3f66-4819-a890-be97dcf586b6	ff999365-26d4-45b2-bec4-44dd8c9f8d3f	32f681ae-7ced-4c25-967e-b1108f7955f1	Migraine	\N	2026-10-12 02:23:56.270173+02	\N	\N	\N	\N	[]	\N
e983fcd0-bc39-4277-b5a9-cdec57dff17d	b1650edb-39b4-4d29-83a9-2c64669dadcb	66dfd812-46eb-4622-aae2-c87bf09b1d03	32f681ae-7ced-4c25-967e-b1108f7955f1	Paludisme	\N	2026-10-12 02:29:24.72043+02	Paracetamol	1	0	1	[{"nom": "Paracetamol", "indication": "Traitement de fond de la migraine", "forme": "comprime", "matin": "1", "midi": "0", "soir": "1", "posologie": "Hoanina miaraka aminy rano refa avy nisakafo", "duree_jours": 26}]	Test DDT
ab6f7b17-0dc1-4370-a558-42753a279bbb	b1650edb-39b4-4d29-83a9-2c64669dadcb	b22e3296-f801-4c26-b278-4068a44f1d33	32f681ae-7ced-4c25-967e-b1108f7955f1	Atteint d'une maladie tres rare	\N	2026-10-13 21:05:59.452217+02	ACT	1	0	2	[{"nom": "ACT", "indication": "Autre", "forme": "comprime", "matin": 1, "midi": 0, "soir": 2, "posologie": "Hoanina miaraka aminy rano refa avy misakafo", "duree_jours": 15}, {"nom": "Efferalgan", "indication": "Traitement de la crise migraineuse", "forme": "autre", "matin": 1, "midi": 1, "soir": 1, "posologie": "Atao anaty rano tapany alohan'ny hatory", "duree_jours": 15}, {"nom": "CAMVIT Plus", "indication": "Autre", "forme": "solution_buvable", "matin": 0.5, "midi": 0.0, "soir": 0.5, "posologie": "Sotroina refa avy amn sakafo, eran'ny sarony", "duree_jours": 11}]	\N
fadf70c4-b401-4614-8da9-cf3b6c3e6314	deb1ecfe-3f66-4819-a890-be97dcf586b6	213af696-89a6-4e0e-9a59-6af1f8b6ea75	32f681ae-7ced-4c25-967e-b1108f7955f1	Fatigue	\N	2026-10-14 04:15:55.312731+02	\N	\N	\N	\N	[]	\N
\.


--
-- TOC entry 5056 (class 0 OID 58447)
-- Dependencies: 227
-- Data for Name: lits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lits (id, numero, categorie, statut, nom_patient_actuel, prenoms_patient_actuel, patient_id, motif_admission, date_occupation, date_liberation, date_creation, date_modification, date_debut_nettoyage, date_reservation, lit_source_reservation_id, motif_infectieux, urgence_vitale, facturation_vip_validee, mission_reservation_id) FROM stdin;
e922a711-b3cb-40cf-909a-b8ba08602713	DECH-02	dechocage	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.58985+02	2026-10-10 02:07:25.58985+02	\N	\N	\N	\N	f	f	\N
7a5ce517-5d82-4206-bcd1-12e3c43c82cd	URG-05	urgence	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.682167+02	2026-10-10 02:07:25.682167+02	\N	\N	\N	\N	f	f	\N
e47437b6-7f1e-4026-bda7-3d34894710f8	URG-06	urgence	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.699504+02	2026-10-10 02:07:25.699504+02	\N	\N	\N	\N	f	f	\N
b7d23958-d433-429c-805c-120db703b966	URG-07	urgence	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.716315+02	2026-10-10 02:07:25.716315+02	\N	\N	\N	\N	f	f	\N
e6639838-7faf-467e-aef9-51bbedecc3c0	URG-08	urgence	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.733488+02	2026-10-10 02:07:25.733488+02	\N	\N	\N	\N	f	f	\N
ab7b711d-14d9-4f0b-81d6-b52f5fe30df6	URG-09	urgence	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.750092+02	2026-10-10 02:07:25.750092+02	\N	\N	\N	\N	f	f	\N
3441439f-12f2-4e7c-9d33-6a36e995170b	URG-10	urgence	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.76683+02	2026-10-10 02:07:25.76683+02	\N	\N	\N	\N	f	f	\N
a6392a48-3a07-415e-b6c0-b9ad4de6e97a	TRI-01	triage	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.783473+02	2026-10-10 02:07:25.783473+02	\N	\N	\N	\N	f	f	\N
5b03b870-bb18-4374-a42a-79c72fe69854	TRI-02	triage	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.80022+02	2026-10-10 02:07:25.80022+02	\N	\N	\N	\N	f	f	\N
ca60d358-6e41-4f1e-bdee-a5be2ec942b1	TRI-03	triage	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.817166+02	2026-10-10 02:07:25.817166+02	\N	\N	\N	\N	f	f	\N
e825b3a3-dc84-48c7-9be7-88e6ff18664c	TRI-04	triage	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.833954+02	2026-10-10 02:07:25.833954+02	\N	\N	\N	\N	f	f	\N
8e8df679-b6ef-4ddd-a3b8-355d828984e4	TRI-05	triage	LIBRE	\N	\N	\N	\N	\N	\N	2026-10-10 02:07:25.850848+02	2026-10-10 02:07:25.850848+02	\N	\N	\N	\N	f	f	\N
275a8204-dc3c-48ec-9129-da4e9a09a8b3	VIP-01	vip	LIBRE	\N	\N	\N	\N	\N	2026-10-13 01:50:03.127816+02	2026-10-10 02:07:25.487864+02	2026-10-13 01:50:03.110571+02	\N	\N	\N	\N	f	f	\N
1b9c6afa-f8bd-4b00-abf8-59c0627cbbd3	SEP-01	salle_septique	LIBRE	\N	\N	\N	\N	\N	2026-10-13 01:50:37.879832+02	2026-10-10 02:07:25.520583+02	2026-10-13 09:47:36.216062+02	\N	\N	\N	\N	f	f	\N
c1bccd54-fb7f-408c-90ef-b2cc5d2ee1b3	SEP-02	salle_septique	LIBRE	\N	\N	\N	\N	\N	2026-10-13 02:53:21.084661+02	2026-10-10 02:07:25.548525+02	2026-10-13 09:47:36.216062+02	\N	\N	\N	\N	f	f	\N
be6ca602-5e8d-4e8a-b5d1-39db619cdde7	DECH-01	dechocage	LIBRE	\N	\N	\N	\N	\N	2026-10-14 04:55:35.713357+02	2026-10-10 02:07:25.570132+02	2026-10-14 04:55:35.69214+02	\N	\N	\N	\N	f	f	\N
616a414d-a7ae-429b-a94e-d0d172d849cd	URG-01	urgence	LIBRE	\N	\N	\N	\N	\N	2026-10-14 04:55:46.666559+02	2026-10-10 02:07:25.608817+02	2026-10-14 04:55:46.652504+02	\N	\N	\N	\N	f	f	\N
604cd714-6c97-4632-9dd2-fe246f7bff3d	URG-02	urgence	LIBRE	\N	\N	\N	\N	\N	2026-10-14 04:55:50.276752+02	2026-10-10 02:07:25.626847+02	2026-10-14 04:55:50.265856+02	\N	\N	\N	\N	f	f	\N
91c5fb96-1eea-4bd0-a6c8-8fe69a56df04	URG-03	urgence	LIBRE	\N	\N	\N	\N	\N	2026-10-14 04:55:53.724462+02	2026-10-10 02:07:25.644765+02	2026-10-14 04:55:53.712199+02	\N	\N	\N	\N	f	f	\N
03da18fe-c55a-4033-8659-69c94d9cf625	URG-04	urgence	LIBRE	\N	\N	\N	\N	\N	2026-10-14 04:56:19.768086+02	2026-10-10 02:07:25.6643+02	2026-10-14 04:56:19.760471+02	\N	\N	\N	\N	f	f	\N
\.


--
-- TOC entry 5058 (class 0 OID 66505)
-- Dependencies: 229
-- Data for Name: courses_ambulance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses_ambulance (id, ambulance_id, nom_patient, prenoms_patient, patient_id, adresse_destination, latitude_destination, longitude_destination, distance_km, tarif_base, frais_retard, montant_total, statut, heure_depart, heure_arrivee_sur_lieux, heure_fin, notes, heure_prise_en_charge, minutes_retard, minutes_sur_place, lit_id, adresse_patient, distance_aller_km, duree_aller_minutes, distance_retour_km, duree_retour_minutes, urgence_vitale, patient_infectieux, motif_infectieux, heure_transport, heure_arrivee_urgences, heure_bionettoyage, lit_secondaire_id, telephone_contact, jeton_suivi_hash, itineraire_index) FROM stdin;
e18cd200-6be6-434e-8ea8-9944c9e2ad46	a631de60-05dd-427b-a6fe-5b2193cfc79a	RAKOTO	Rakoto	\N	Andohatapenaka	-18.9044672	47.4987598	6.3248999999999995	130000	35000	165000	TERMINEE	2026-10-12 04:06:43.589548+02	\N	2026-10-12 04:07:08.873439+02	\N	\N	1	61	616a414d-a7ae-429b-a94e-d0d172d849cd		0	0	0	0	f	f	\N	\N	\N	\N	\N	\N	\N	0
3dfba2e9-7a02-43ac-a0ee-1eccd8c815a2	a631de60-05dd-427b-a6fe-5b2193cfc79a		MIRANTSOA	\N	Ambatobe	-18.8793892	47.5585948	9.2305	130000	0	130000	terminee	2026-10-13 18:32:28.898982+02	2026-10-13 18:33:46.25807+02	2026-10-13 18:34:22.149425+02	Sinusite	2026-10-13 18:34:04.829686+02	0	0	604cd714-6c97-4632-9dd2-fe246f7bff3d	Ambatobe	4.6196	7	4.6109	7	f	f	\N	2026-10-13 18:34:04.829686+02	2026-10-13 18:34:14.798129+02	2026-10-13 18:34:17.261822+02	\N	+261332222222	3e7c365d5e7576f32c57f42d5a629396601b399b3e391a0fd05284d15f85f22c	0
75831af9-6e2b-4e29-8bd1-0991cc8f3ac4	a631de60-05dd-427b-a6fe-5b2193cfc79a	RASOANIRINA	Rasoa	deb1ecfe-3f66-4819-a890-be97dcf586b6	Alasora	-18.9553235	47.5674821	18.4924	130000	0	130000	terminee	2026-10-13 17:16:46.687505+02	2026-10-13 17:17:29.29398+02	2026-10-13 17:18:15.463407+02	\N	2026-10-13 17:17:40.579647+02	0	0	616a414d-a7ae-429b-a94e-d0d172d849cd	Alasora	9.2609	13	9.2315	12	f	f	\N	2026-10-13 17:17:40.579647+02	2026-10-13 17:18:07.731023+02	2026-10-13 17:18:10.236095+02	\N	+261330000000	\N	0
96b2b5c8-3aa7-4401-977b-64ab5bd84308	a631de60-05dd-427b-a6fe-5b2193cfc79a	non renseigné	Patient	\N	Ambanidia	-18.9188124	47.5391554	7.577500000000001	130000	0	130000	terminee	2026-10-13 17:13:32.060773+02	2026-10-13 17:14:22.456258+02	2026-10-13 17:14:32.795384+02	\N	2026-10-13 17:14:23.903236+02	0	0	be6ca602-5e8d-4e8a-b5d1-39db619cdde7	Ambanidia	3.7919	6	3.7856	5	t	f	\N	2026-10-13 17:14:23.903236+02	2026-10-13 17:14:28.271584+02	2026-10-13 17:14:31.045544+02	\N	\N	9e21ccd65ec6fb73c2411994b3d40d2d4b7fb6edc0b8068a0d48d4f46ef2f873	0
6ea08133-f6a7-4985-adfb-23139d64fb78	a631de60-05dd-427b-a6fe-5b2193cfc79a		Judicael	\N	67 ha	-18.9050014	47.5092176	10.843900000000001	130000	0	130000	terminee	2026-10-13 02:43:06.035324+02	2026-10-13 02:45:45.287955+02	2026-10-13 02:47:07.664336+02	\N	2026-10-13 02:45:51.276893+02	0	0	be6ca602-5e8d-4e8a-b5d1-39db619cdde7	67 ha	5.2946	7	5.549300000000001	7	t	f	\N	2026-10-13 02:45:51.276893+02	2026-10-13 02:46:43.238105+02	2026-10-13 02:46:52.765902+02	\N	\N	\N	0
acf8e7b1-6f6d-44c6-b2d4-33efefd6a6a0	a631de60-05dd-427b-a6fe-5b2193cfc79a		Hasina	\N	Avaradoha	-18.9001063	47.5438721	2.4265	70000	0	70000	terminee	2026-10-13 02:56:28.658395+02	2026-10-13 02:56:36.087717+02	2026-10-13 02:56:50.599073+02	\N	2026-10-13 02:56:39.090371+02	0	0	616a414d-a7ae-429b-a94e-d0d172d849cd	Avaradoha	1.207	2	1.2195	3	f	f	\N	2026-10-13 02:56:39.090371+02	2026-10-13 02:56:40.809748+02	2026-10-13 02:56:43.31482+02	\N	\N	\N	0
6ab9f44e-976d-4549-99ba-a5fdc9ddc479	7f94102d-4f63-4735-960c-3e766b2aaa33		Hasimbola	\N	Nanisana	-18.8898644	47.5488231	3.1077000000000004	70000	210000	280000	terminee	2026-10-13 02:49:45.199757+02	2026-10-13 02:52:56.10633+02	2026-10-13 09:47:10.425453+02	\N	2026-10-13 02:53:03.388127+02	353	413	c1bccd54-fb7f-408c-90ef-b2cc5d2ee1b3	Nanisana	1.5722	3	1.5355	3	f	t	COVID-19	2026-10-13 02:53:03.388127+02	2026-10-13 02:53:14.155798+02	2026-10-13 02:53:21.084661+02	\N	\N	\N	0
1a173271-b11b-419b-b5f0-36bca87933da	a631de60-05dd-427b-a6fe-5b2193cfc79a	Guy	Judichaël	b1650edb-39b4-4d29-83a9-2c64669dadcb	67 ha	-18.9050014	47.5092176	10.843900000000001	130000	0	130000	terminee	2026-10-14 04:23:15.634803+02	2026-10-14 04:24:07.192555+02	2026-10-14 04:24:44.376446+02	\N	2026-10-14 04:24:15.61827+02	0	0	91c5fb96-1eea-4bd0-a6c8-8fe69a56df04	67 ha	5.2946	7	5.549300000000001	7	f	f	\N	2026-10-14 04:24:15.61827+02	2026-10-14 04:24:36.126862+02	2026-10-14 04:24:40.503339+02	\N	+261339933053	\N	0
60f53314-7566-4412-b40d-b5bee4cc376d	a631de60-05dd-427b-a6fe-5b2193cfc79a	non renseigné	Patient	\N	67 ha	-18.9050014	47.5092176	10.843900000000001	130000	0	130000	terminee	2026-10-13 16:53:44.111037+02	2026-10-13 16:54:51.486152+02	2026-10-13 16:55:01.825171+02	\N	2026-10-13 16:54:53.087085+02	0	0	be6ca602-5e8d-4e8a-b5d1-39db619cdde7	67 ha	5.2946	7	5.549300000000001	7	t	f	\N	2026-10-13 16:54:53.087085+02	2026-10-13 16:54:55.079931+02	2026-10-13 16:54:58.594472+02	\N	\N	1ef97d193ec9a618e92bf9f1b18737e2b5a4eda0c8a909fbd34c3eb1a9671c08	0
7047fe26-d673-4345-8a64-18cc8acb756a	a631de60-05dd-427b-a6fe-5b2193cfc79a	Guy	Judichaël	b1650edb-39b4-4d29-83a9-2c64669dadcb	67 ha	-18.9050014	47.5092176	10.843900000000001	130000	0	130000	terminee	2026-10-14 04:28:30.804429+02	2026-10-14 04:32:37.131405+02	2026-10-14 04:33:12.374533+02	\N	2026-10-14 04:32:47.544231+02	0	0	03da18fe-c55a-4033-8659-69c94d9cf625	67 ha	5.2946	7	5.549300000000001	7	f	f	\N	2026-10-14 04:32:47.544231+02	2026-10-14 04:33:01.966942+02	2026-10-14 04:33:10.359082+02	\N	+261339933053	\N	0
\.


--
-- TOC entry 5053 (class 0 OID 58389)
-- Dependencies: 224
-- Data for Name: infos_centre; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.infos_centre (id, email_centre, date_modification) FROM stdin;
1	\N	2026-10-10 01:53:54.794709+02
\.


--
-- TOC entry 5055 (class 0 OID 58414)
-- Dependencies: 226
-- Data for Name: telephones_centre; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telephones_centre (id, infos_centre_id, numero, libelle, ordre) FROM stdin;
\.


--
-- TOC entry 5068 (class 0 OID 0)
-- Dependencies: 223
-- Name: infos_centre_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.infos_centre_id_seq', 1, false);


-- Completed on 2026-10-14 09:30:18

--
-- PostgreSQL database dump complete
--

\unrestrict zj9JEApt0hDmy05kqy4rRMzglx6KxGJND0natjcah08chRt979kwOuoQBUAuW90

