/*
  # Seed 10 Programs for Voice of Preemies

  1. Programs Seeded
    - Parent Emotional Support (Core Program)
    - NICU Family Support Program (Hospital Program)
    - Kangaroo Mother Care & Home Transition (Core Program)
    - Breastfeeding & Nutrition Support (Core Program)
    - Father & Family Inclusion Program (Specialized Support)
    - Parent Support Communities (Community)
    - Financial & Practical Assistance (Community)
    - Education & Awareness (Education)
    - Bereavement & Loss Support (Specialized Support)
    - Professional & Hospital Partnerships (Advocacy)

  2. Each program includes
    - Full services array
    - Target audience and access info
    - Curated Pexels image URL
    - Unique slug for URL routing
    - Evocative tagline
    - Extended long description for detail pages
*/

INSERT INTO programs (slug, title, tag, tagline, description, long_description, image_url, icon_name, services, who_for, how_to_access, published, sort_order)
VALUES
(
  'parent-emotional-support',
  'Parent Emotional Support',
  'Core Program',
  'Because parents need care too.',
  'Supporting parents emotionally during NICU hospitalization and the recovery journey home. In Rwanda and many African communities, mental health support is often missing after childbirth trauma — this program fills that gap.',
  'The Parent Emotional Support program is the heart of Voice of Preemies. We recognize that when a baby arrives prematurely, parents experience a unique form of trauma — anxiety, guilt, fear, and isolation that can last long after discharge. In many African communities, mental health support after childbirth trauma remains scarce and stigmatized. Our program breaks that silence by providing safe, culturally sensitive spaces where parents can process their emotions, connect with trained counselors, and find strength alongside others who truly understand their journey. From one-on-one sessions to group listening circles, we walk beside parents every step of the way.',
  'https://images.pexels.com/photos/13984519/pexels-photo-13984519.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Heart',
  '["One-on-one emotional support sessions", "Parent listening sessions and group circles", "Stress and trauma counseling", "Support for anxiety after premature birth", "Mental wellness check-ins", "Peer mentorship from experienced parents"]',
  'All parents and caregivers of premature babies — mothers, fathers, and extended family members experiencing emotional distress.',
  'Contact us directly, ask your NICU nurse, or join one of our weekly group sessions in Kigali.',
  true,
  1
),
(
  'nicu-family-support',
  'NICU Family Support Program',
  'Hospital Program',
  'Navigating the NICU, together.',
  'Helping families navigate the overwhelming world of neonatal intensive care with guidance, advocacy, and compassionate support at the bedside.',
  'The NICU is one of the most overwhelming environments a parent can face. Machines beeping, medical terminology, the sight of your tiny baby connected to tubes — it can feel paralyzing. Our NICU Family Support Program places trained peer mentors and family advocates directly within partner hospital NICUs across Rwanda. We bridge the gap between medical teams and families, explaining procedures in plain language, helping parents advocate for their baby, coordinating family visits, and providing the emotional anchor families desperately need during hospitalization. No parent should feel like a visitor in their own baby''s care.',
  'https://images.pexels.com/photos/12365687/pexels-photo-12365687.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Building2',
  '["NICU orientation and navigation guidance", "Explaining medical procedures in simple language", "Parent advocacy assistance with medical teams", "Family visiting coordination and support", "Hospital-family communication facilitation", "Emotional support during hospitalization"]',
  'Parents and families with babies currently admitted in partner NICU facilities.',
  'Ask your NICU nurse to connect you with our in-hospital support team, or contact us directly.',
  true,
  2
),
(
  'kangaroo-mother-care',
  'Kangaroo Mother Care & Home Transition',
  'Core Program',
  'From hospital care to home confidence.',
  'Kangaroo Mother Care is one of the most powerful interventions for premature babies in Africa. We educate families and support the critical transition from hospital to home.',
  'Kangaroo Mother Care (KMC) — continuous skin-to-skin contact between parent and baby — is one of the most evidence-based, life-saving interventions for premature infants, especially in resource-limited settings. Our program provides comprehensive KMC education to parents while their baby is still in the NICU, then extends that support through the critical discharge transition. We guide families on safe home care practices, feeding schedules, hygiene and infection prevention, temperature regulation, and danger signs to watch for. The journey from hospital to home can feel terrifying — our team ensures no family makes it alone.',
  'https://images.pexels.com/photos/19782322/pexels-photo-19782322.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Baby',
  '["Kangaroo Mother Care education and coaching", "Safe home transition preparation", "Premature baby home-care guidance", "Feeding schedule support and monitoring", "Hygiene and infection prevention education", "Post-discharge follow-up support"]',
  'Parents preparing to bring their premature baby home from the NICU, and families in the first months after discharge.',
  'Enrolled automatically for families in our partner NICUs. Community families can contact us for home support.',
  true,
  3
),
(
  'breastfeeding-nutrition-support',
  'Breastfeeding & Nutrition Support',
  'Core Program',
  'Nourishing the tiniest fighters.',
  'Specialized lactation and nutrition support for mothers of premature babies — from milk expression in the NICU to sustainable feeding at home.',
  'Feeding a premature baby presents unique challenges that many mothers are unprepared for. Babies may be too small or weak to latch, milk supply may be delayed, and the stress of the NICU can further complicate lactation. Our Breastfeeding and Nutrition program provides hands-on lactation support from trained counselors who understand the specific needs of preterm infants. We teach milk expression techniques, help mothers establish and maintain supply, provide guidance on fortification and supplementation when needed, and support the transition to direct breastfeeding. We also address maternal nutrition — because a well-nourished mother is the foundation of a well-nourished baby.',
  'https://images.pexels.com/photos/7943124/pexels-photo-7943124.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Coffee',
  '["Breastfeeding premature babies guidance", "Lactation counselor support", "Milk expression education and techniques", "Nutrition guidance for preterm infants", "Mother nutrition education and support", "Transition to direct breastfeeding coaching"]',
  'Mothers of premature babies at any stage — from NICU admission through the first year at home.',
  'Available at all partner NICU sites. Community mothers can request support through our contact form.',
  true,
  4
),
(
  'father-family-inclusion',
  'Father & Family Inclusion Program',
  'Specialized Support',
  'Prematurity affects the whole family.',
  'Fathers, siblings, and extended family members are often overlooked in neonatal care. This program ensures the whole family is included, informed, and supported.',
  'When a baby arrives early, the focus naturally falls on mother and baby — but fathers, siblings, and grandparents are profoundly affected too. Many African fathers report feeling helpless, excluded from care decisions, and unsure how to support their partner. Siblings may feel confused or abandoned. Extended family may spread misinformation or add pressure. Our Father and Family Inclusion Program specifically addresses these overlooked needs. We provide dedicated father support groups, sibling preparation sessions, extended family education, and whole-family counseling. Because healing happens faster when the entire family system is supported.',
  'https://images.pexels.com/photos/6624358/pexels-photo-6624358.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Users',
  '["Father emotional support and peer groups", "Family counseling sessions", "Sibling preparation and inclusion activities", "Extended family education workshops", "Building home support systems", "Couple communication support"]',
  'Fathers, siblings, grandparents, and extended family members of premature babies.',
  'Fathers can join our monthly men''s group directly. Family sessions available by request through our support form.',
  true,
  5
),
(
  'parent-support-communities',
  'Parent Support Communities',
  'Community',
  'You are never alone in this journey.',
  'Building lasting connections between families who share the premature birth experience — through gatherings, online groups, and storytelling events.',
  'The loneliness of having a premature baby can be overwhelming. Friends and family often don''t understand. Our Parent Support Communities create spaces — both physical and virtual — where families connect with others who truly ''get it.'' From monthly parent gatherings in Kigali to WhatsApp support groups that are active around the clock, from hospital support circles to annual storytelling events where parents share their journeys publicly — we build community that lasts far beyond the NICU. These connections become lifelines, friendships, and sources of hope for newly affected families.',
  'https://images.pexels.com/photos/18824545/pexels-photo-18824545.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Globe',
  '["Monthly parent gatherings in Kigali", "Online support groups and forums", "WhatsApp support communities (24/7)", "Hospital-based support circles", "Parent storytelling and sharing events", "Annual Voice of Preemies Family Day"]',
  'Any parent or family member affected by premature birth — current and past NICU families welcome.',
  'Join our WhatsApp community instantly, or attend our next monthly gathering. No registration needed for open events.',
  true,
  6
),
(
  'financial-practical-assistance',
  'Financial & Practical Assistance',
  'Community',
  'Removing barriers to care.',
  'Prematurity places enormous financial strain on families. We provide practical assistance to ensure no baby''s care is compromised by economic hardship.',
  'In Rwanda and across Africa, the financial burden of a premature birth can be catastrophic. Extended hospital stays, specialized formula, transport costs, lost income — families face impossible choices between care and survival. Our Financial and Practical Assistance program addresses these urgent needs directly. We provide emergency transport to hospitals, essential care packages (diapers, feeding supplies, clothing for tiny babies), accommodation partnerships for families who travel far for NICU care, and referral assistance for financial aid programs. We believe that no family should have to choose between their baby''s survival and their own.',
  'https://images.pexels.com/photos/18788957/pexels-photo-18788957.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'HandHeart',
  '["Emergency transport assistance to hospitals", "Hospital essentials and care packages", "Premature baby starter kits", "Diapers and feeding supplies support", "Accommodation partnerships near hospitals", "Financial aid referral assistance"]',
  'Families facing financial hardship due to premature birth — assessed on need, not means.',
  'Speak with our in-hospital team or submit a request through our support form. Emergency cases prioritized.',
  true,
  7
),
(
  'education-awareness',
  'Education & Awareness',
  'Education',
  'Knowledge is the first step to better outcomes.',
  'Raising awareness about prematurity through campaigns, educational resources, hospital workshops, and community outreach across Rwanda.',
  'Many premature births and their complications could be reduced with better awareness — of warning signs during pregnancy, of the importance of antenatal care, of what to expect in the NICU, and of how to care for a preterm baby at home. Our Education and Awareness program creates and distributes culturally appropriate educational materials, runs community workshops, conducts hospital awareness sessions, and leads national campaigns including World Prematurity Day. We produce parent guides, video resources, and training materials in Kinyarwanda, French, and English — ensuring that life-saving information reaches every family that needs it.',
  'https://images.pexels.com/photos/16629768/pexels-photo-16629768.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'BookOpen',
  '["Prematurity awareness campaigns", "Parent educational resources and guides", "Hospital workshops for families", "Community education and outreach", "Early warning education during pregnancy", "World Prematurity Day annual campaign"]',
  'Expecting parents, community members, community health workers, and the general public.',
  'Resources freely available on our website. Workshop schedules posted monthly. Community outreach by invitation.',
  true,
  8
),
(
  'bereavement-loss-support',
  'Bereavement & Loss Support',
  'Specialized Support',
  'Your grief is valid. Your baby mattered.',
  'Compassionate, culturally sensitive support for families who have experienced the loss of a premature baby — because grief deserves space and care.',
  'Losing a baby is one of the most devastating experiences a family can endure. In many African cultures, neonatal loss is surrounded by silence — families are expected to ''move on'' quickly, and the depth of parental grief is often minimized or misunderstood. Our Bereavement program creates a safe, compassionate space for families to grieve, remember, and heal. We offer dedicated grief counseling, bereaved parent peer groups where families connect with others who understand their loss, memory-making support, and culturally and religiously sensitive mourning guidance. We believe every baby''s life — no matter how brief — deserves to be honored.',
  'https://images.pexels.com/photos/8865097/pexels-photo-8865097.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Heart',
  '["Emotional support after neonatal loss", "Grief counseling with trained professionals", "Bereaved parent peer support groups", "Family healing and remembrance support", "Memorial and memory-making initiatives", "Long-term grief follow-up"]',
  'Families who have experienced the loss of a premature baby — at any time, whether recent or past.',
  'Contact us directly and in complete confidence. Self-referral or referral by healthcare providers welcome.',
  true,
  9
),
(
  'professional-hospital-partnerships',
  'Professional & Hospital Partnerships',
  'Advocacy',
  'Strengthening systems, saving lives.',
  'Collaborating with healthcare institutions, training neonatal staff, and advocating for better neonatal care policies across Rwanda.',
  'Sustainable change in neonatal outcomes requires systemic action. Our Professional and Hospital Partnerships program works alongside Rwanda''s healthcare institutions to strengthen neonatal care from within. We collaborate with NICU staff on family-centered care approaches, provide training on parent communication and psychosocial support, partner on research initiatives, advocate for improved neonatal health policies, and build bridges between hospitals and community health workers. By partnering with the professionals who care for premature babies every day, we multiply our impact far beyond what any single organization could achieve alone.',
  'https://images.pexels.com/photos/12793736/pexels-photo-12793736.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  'Shield',
  '["Neonatal staff collaboration and training", "Family-centered care partnerships", "Hospital awareness and sensitization initiatives", "Neonatal research and data partnerships", "Health policy advocacy", "Community health worker outreach programs"]',
  'Healthcare professionals, hospital administrators, neonatal nurses, community health workers, and policymakers.',
  'Institutional partnerships by formal request. Individual healthcare professionals welcome at our training events.',
  true,
  10
)
ON CONFLICT (slug) DO NOTHING;
