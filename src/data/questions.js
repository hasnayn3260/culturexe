export const questions = [

  // ── 00 · About You ───────────────────────────────────────
  { id: 'ay1', dimension: 'about_you', type: 'SHORT_TEXT',    text: 'Which division or department do you work in?', hint: 'e.g. Credit, Finance, Operations' },
  { id: 'ay2', dimension: 'about_you', type: 'SINGLE_CHOICE', text: 'How long have you worked at DBN?', options: { choices: ['Less than 1 year', '1–3 years', '4–7 years', '8+ years'] } },
  { id: 'ay3', dimension: 'about_you', type: 'SINGLE_CHOICE', text: 'What is your role level?', options: { choices: ['Staff', 'Specialist', 'Manager', 'Senior leadership'] } },

  // ── 01 · Strategic Coherence ──────────────────────────────
  { id: 'sc1', dimension: 'strategic_coherence', type: 'LIKERT', text: "I understand DBN's strategic priorities clearly enough to explain them in my own words." },
  { id: 'sc2', dimension: 'strategic_coherence', type: 'LIKERT', text: "I understand how my role contributes to DBN's mandate and strategic objectives." },
  { id: 'sc3', dimension: 'strategic_coherence', type: 'LIKERT', text: "When priorities compete, I know what DBN's strategy says should come first." },
  { id: 'sc4', dimension: 'strategic_coherence', type: 'LIKERT', text: "In my area, day-to-day decisions and work priorities are guided by DBN's strategic direction." },

  // ── 02 · Systems Intelligence ─────────────────────────────
  { id: 'si1', dimension: 'systems_intelligence', type: 'LIKERT', text: "Work between departments is coordinated around shared DBN outcomes, not only departmental priorities." },
  { id: 'si2', dimension: 'systems_intelligence', type: 'LIKERT', text: "DBN's systems and processes make it easy for teams to share information and complete work across functions." },
  { id: 'si3', dimension: 'systems_intelligence', type: 'LIKERT', text: "When work moves from one team to another, responsibilities, timelines and handovers are clear." },
  { id: 'si4', dimension: 'systems_intelligence', type: 'LIKERT', text: "My direct line manager makes decisions with the impact on the full DBN value chain in mind." },

  // ── 03 · Execution Discipline ─────────────────────────────
  { id: 'ed1', dimension: 'execution_discipline', type: 'LIKERT', text: "My role, responsibilities, performance expectations and decision boundaries are clear." },
  { id: 'ed2', dimension: 'execution_discipline', type: 'LIKERT', text: "Performance standards in my area are clear, measurable and applied consistently." },
  { id: 'ed3', dimension: 'execution_discipline', type: 'LIKERT', text: "Decisions and agreed actions are followed through within reasonable timeframes." },
  { id: 'ed4', dimension: 'execution_discipline', type: 'LIKERT', text: "Performance, conduct and non-delivery are addressed fairly, directly and consistently across DBN." },

  // ── 04 · Purpose and Meaning ──────────────────────────────
  { id: 'pm1', dimension: 'purpose_and_meaning', type: 'LIKERT', text: "I understand DBN's purpose and why its work matters for Namibia." },
  { id: 'pm2', dimension: 'purpose_and_meaning', type: 'LIKERT', text: "I can see a clear link between my work and DBN's development mandate." },
  { id: 'pm3', dimension: 'purpose_and_meaning', type: 'LIKERT', text: "DBN's purpose gives meaning to the work I do." },
  { id: 'pm4', dimension: 'purpose_and_meaning', type: 'LIKERT', text: "I am proud of the impact DBN is working to create." },

  // ── 05 · Governance and Decision-rights ───────────────────
  { id: 'gd1', dimension: 'governance_and_decision_rights', type: 'LIKERT', text: "I understand where decisions that affect my work should be made and who has authority to make them." },
  { id: 'gd2', dimension: 'governance_and_decision_rights', type: 'LIKERT', text: "Decisions are made at the right level without unnecessary escalation." },
  { id: 'gd3', dimension: 'governance_and_decision_rights', type: 'LIKERT', text: "Decisions that affect my work are communicated clearly for me to act on them." },
  { id: 'gd4', dimension: 'governance_and_decision_rights', type: 'LIKERT', text: "Approval processes help manage risk without unnecessarily delaying delivery." },
  { id: 'gd5', dimension: 'governance_and_decision_rights', type: 'LIKERT', text: "I trust DBN's people-related processes to be handled fairly, consistently and confidentially." },

  // ── 06 · Value Recognition ────────────────────────────────
  { id: 'vr1', dimension: 'value_recognition', type: 'LIKERT', text: "My direct line manager recognises my contribution and supports fair access to growth and development opportunities." },
  { id: 'vr2', dimension: 'value_recognition', type: 'LIKERT', text: "My pay, benefits and rewards are fair in relation to my role, responsibilities, contribution and performance." },
  { id: 'vr3', dimension: 'value_recognition', type: 'LIKERT', text: "I receive regular, honest feedback from my direct line manager that helps me understand how I am performing and where I can improve." },
  { id: 'vr4', dimension: 'value_recognition', type: 'LIKERT', text: "Appointments, promotions, recognition, rewards and development opportunities at DBN are based on transparent criteria, contribution and performance rather than personal relationships." },

  // ── 07 · Listening and Learning ───────────────────────────
  { id: 'll1', dimension: 'listening_and_learning', type: 'LIKERT', text: "My direct line manager seeks to understand issues properly before drawing conclusions." },
  { id: 'll2', dimension: 'listening_and_learning', type: 'LIKERT', text: "My direct line manager treats feedback from me as useful information, even when it is difficult to hear." },
  { id: 'll3', dimension: 'listening_and_learning', type: 'LIKERT', text: "Lessons from work, projects and setbacks are shared so that teams can improve." },
  { id: 'll4', dimension: 'listening_and_learning', type: 'LIKERT', text: "Employee feedback and lessons learned lead to visible improvements in how work is done at DBN." },

  // ── 08 · Leadership Influence ─────────────────────────────
  { id: 'li1', dimension: 'leadership_influence', type: 'LIKERT', text: "My direct line manager gives clear and consistent direction about priorities and expectations in my work area." },
  { id: 'li2', dimension: 'leadership_influence', type: 'LIKERT', text: "My direct line manager is accessible when I need guidance, clarity or support." },
  { id: 'li3', dimension: 'leadership_influence', type: 'LIKERT', text: "My direct line manager models the standards and behaviours they expect from others." },
  { id: 'li4', dimension: 'leadership_influence', type: 'LIKERT', text: "My direct line manager helps create a team environment where people can perform, learn and work well together." },

  // ── 09 · Psychological Safety ─────────────────────────────
  { id: 'ps1', dimension: 'psychological_safety', type: 'LIKERT', text: "I can raise work-related concerns with my direct line manager without fear of retaliation or negative consequences." },
  { id: 'ps2', dimension: 'psychological_safety', type: 'LIKERT', text: "I can respectfully question anyone's ideas or decisions, regardless of their level or position." },
  { id: 'ps3', dimension: 'psychological_safety', type: 'LIKERT', text: "Mistakes are discussed with my manager in a way that supports learning and improvement, not blame." },
  { id: 'ps4', dimension: 'psychological_safety', type: 'LIKERT', text: "I feel respected and valued at DBN as a person, not only for the work I deliver." },

  // ── 10 · Innovation ───────────────────────────────────────
  { id: 'in1', dimension: 'innovation', type: 'LIKERT', text: "I am encouraged to suggest better ways of working, even when they challenge existing practice." },
  { id: 'in2', dimension: 'innovation', type: 'LIKERT', text: "When new ideas do not work, my team uses the experience to learn and improve." },
  { id: 'in3', dimension: 'innovation', type: 'LIKERT', text: "My department creates space for people across teams to develop and test new ideas." },
  { id: 'in4', dimension: 'innovation', type: 'LIKERT', text: "My direct line manager supports new ideas that can help DBN improve its work." },

  // ── 11 · Agility and Resilience ───────────────────────────
  { id: 'ar1', dimension: 'agility_and_resilience', type: 'LIKERT', text: "My team adapts effectively when priorities, conditions or stakeholder demands change." },
  { id: 'ar2', dimension: 'agility_and_resilience', type: 'LIKERT', text: "Under pressure, my team finds practical solutions without compromising quality, ethics or service." },
  { id: 'ar3', dimension: 'agility_and_resilience', type: 'LIKERT', text: "My direct line manager helps my team reprioritise and adapt when circumstances or work demands change." },
  { id: 'ar4', dimension: 'agility_and_resilience', type: 'LIKERT', text: "My team has the capacity, resources and wellbeing support needed to respond effectively during periods of change or pressure." },

  // ── 12 · Customer Orientation ─────────────────────────────
  { id: 'co1', dimension: 'customer_orientation', type: 'LIKERT', text: "I understand who depends on my work, both inside and outside DBN, and what they need from me." },
  { id: 'co2', dimension: 'customer_orientation', type: 'LIKERT', text: "We consider the impact of our decisions on customers, stakeholders and internal service users." },
  { id: 'co3', dimension: 'customer_orientation', type: 'LIKERT', text: "Customer and stakeholder needs shape how my team plans, prioritises and improves work." },
  { id: 'co4', dimension: 'customer_orientation', type: 'LIKERT', text: "When a customer or stakeholder raises a concern, it is taken seriously and responded to within a reasonable time by my team." },

  // ── 13 · EXCO Trust Index ─────────────────────────────────
  // "EXCO" = DBN's Executive Committee as a collective leadership team, not your direct line manager or one individual executive.
  { id: 'et1', dimension: 'exco_trust_index', type: 'LIKERT', text: "I trust EXCO to act in the best interests of DBN and its employees.", hint: "EXCO refers to DBN's Executive Committee as a collective leadership team — not your direct line manager or one individual executive." },
  { id: 'et2', dimension: 'exco_trust_index', type: 'LIKERT', text: "EXCO provides clear and consistent direction on DBN's priorities and what matters most." },
  { id: 'et3', dimension: 'exco_trust_index', type: 'LIKERT', text: "EXCO communicates important decisions and changes clearly enough for employees to understand what is changing and why." },
  { id: 'et4', dimension: 'exco_trust_index', type: 'LIKERT', text: "EXCO models the standards, accountability and behaviours expected across DBN." },
  { id: 'et5', dimension: 'exco_trust_index', type: 'LIKERT', text: "EXCO acts fairly and consistently when making or approving people-related decisions." },
  { id: 'et6', dimension: 'exco_trust_index', type: 'LIKERT', text: "EXCO creates an environment where employees can raise concerns without fear of retaliation or negative consequences." },
  { id: 'et7', dimension: 'exco_trust_index', type: 'LIKERT', text: "EXCO takes employee wellbeing, workload and organisational pressure seriously when making decisions." },
  { id: 'et8', dimension: 'exco_trust_index', type: 'LIKERT', text: "When employee feedback is raised, EXCO follows through in ways that lead to visible improvement." },

  // ── 14 · Overall Recommendation (NPS) ────────────────────
  { id: 'nps1', dimension: 'overall_recommendation', type: 'RATING_SCALE', text: "How likely are you to recommend DBN as a good place to work to a friend, family member or colleague?", options: { min: 0, max: 10, min_label: 'Not at all likely', max_label: 'Extremely likely' } },

  // ── 15 · Open Questions ───────────────────────────────────
  { id: 'oq1', dimension: 'open_questions', type: 'LONG_TEXT', text: "What gets in the way of you doing your best work at DBN?" },
  { id: 'oq2', dimension: 'open_questions', type: 'LONG_TEXT', text: "Where do handovers, processes, systems or decision-making slow down your division's ability to deliver?" },
  { id: 'oq3', dimension: 'open_questions', type: 'LONG_TEXT', text: "What should DBN continue, stop or change to strengthen its culture and employee experience?" },
  { id: 'oq4', dimension: 'open_questions', type: 'LONG_TEXT', text: "What is one issue the Executive leadership may not fully see or understand, but needs to take seriously?" },
]
